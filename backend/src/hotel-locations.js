const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CEBU_BOUNDS = { south: 9, west: 123, north: 12, east: 125 };
const HOTEL_LOOKUP_CACHE_MS = 24 * 60 * 60 * 1000;
const ADDRESS_LOOKUP_CACHE_MS = 10 * 60 * 1000;

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function coordinatesFromResult(result) {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

function isInCebu(coordinates) {
  return coordinates.latitude >= CEBU_BOUNDS.south &&
    coordinates.latitude <= CEBU_BOUNDS.north &&
    coordinates.longitude >= CEBU_BOUNDS.west &&
    coordinates.longitude <= CEBU_BOUNDS.east;
}

function toCandidate(result, index) {
  const coordinates = coordinatesFromResult(result);
  if (!coordinates) return null;

  return {
    id: String(result.place_id ?? index),
    name: String(result.name || result.address?.hotel || result.address?.tourism || ""),
    address: String(result.display_name || ""),
    ...coordinates
  };
}

function isExactHotelMatch(result, hotel) {
  const resultName = normalize(
    result.name || result.namedetails?.name || result.address?.hotel || ""
  );
  const hotelName = normalize(hotel.name);
  const locationText = normalize(result.display_name);
  const expectedTown = normalize(hotel.town);
  const country = normalize(result.address?.country_code);

  return resultName === hotelName &&
    expectedTown.length > 0 &&
    country === "ph" &&
    locationText.includes(expectedTown);
}

function validateHotelId(value) {
  return typeof value === "string" &&
    /^[1-9]\d{0,18}$/.test(value);
}

export function createHotelLocationService({
  pool,
  fetchImpl = fetch,
  minimumRequestIntervalMs = 1100,
  now = Date.now,
  sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
}) {
  let requestQueue = Promise.resolve();
  let nextRequestAt = 0;
  const hotelLookups = new Map();
  const addressLookups = new Map();

  function requestNominatim(query, boundedToCebu) {
    const parameters = new URLSearchParams({
      q: query,
      format: "jsonv2",
      addressdetails: "1",
      namedetails: "1",
      limit: "5"
    });
    if (boundedToCebu) {
      parameters.set("viewbox", "123,12,125,9");
      parameters.set("bounded", "1");
      parameters.set("countrycodes", "ph");
    }

    const lookup = requestQueue.then(async () => {
      const wait = nextRequestAt - now();
      if (wait > 0) await sleep(wait);
      nextRequestAt = now() + minimumRequestIntervalMs;

      const response = await fetchImpl(`${NOMINATIM_URL}?${parameters}`, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "CebuStays/1.0 (hotel map; https://team-pikachu-database.github.io/cebueautiful/)"
        },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        throw new Error(`Geocoding service returned HTTP ${response.status}.`);
      }

      const results = await response.json();
      if (!Array.isArray(results)) {
        throw new Error("Geocoding service returned an invalid response.");
      }
      return results;
    });
    requestQueue = lookup.then(() => undefined, () => undefined);
    return lookup;
  }

  async function getHotelLocation(hotelId) {
    if (!validateHotelId(hotelId)) return { status: "invalid" };

    let supportsCoordinateStorage = true;
    let hotelResult;
    try {
      hotelResult = await pool.query(
        `SELECT id::text AS id, name, location, town, latitude, longitude
         FROM public.sen
         WHERE id = $1`,
        [hotelId]
      );
    } catch (error) {
      if (error?.code !== "42703") throw error;
      supportsCoordinateStorage = false;
      hotelResult = await pool.query(
        `SELECT id::text AS id, name, location, town
         FROM public.sen
         WHERE id = $1`,
        [hotelId]
      );
    }
    const hotel = hotelResult.rows[0];
    if (!hotel) return { status: "not_found" };

    const savedCoordinates = {
      latitude: Number(hotel.latitude),
      longitude: Number(hotel.longitude)
    };
    if (
      hotel.latitude !== null &&
      hotel.latitude !== undefined &&
      hotel.longitude !== null &&
      hotel.longitude !== undefined &&
      isInCebu(savedCoordinates)
    ) {
      return {
        status: "resolved",
        location: { ...savedCoordinates, address: [hotel.location, hotel.town, "Cebu, Philippines"].filter(Boolean).join(", ") }
      };
    }

    const cacheKey = hotel.id;
    const cached = hotelLookups.get(cacheKey);
    if (cached && cached.expiresAt > now()) return cached.value;
    if (cached) hotelLookups.delete(cacheKey);

    const resultPromise = (async () => {
      const query = [
        String(hotel.name ?? "").trim(),
        String(hotel.town ?? "").trim(),
        "Cebu, Philippines"
      ].filter(Boolean).join(", ");
      const results = await requestNominatim(query, true);
      const candidates = results
        .map(toCandidate)
        .filter(candidate => candidate && isInCebu(candidate));
      const exactMatches = results
        .map((result, index) => ({ result, candidate: toCandidate(result, index) }))
        .filter(({ result, candidate }) =>
          candidate && isInCebu(candidate) && isExactHotelMatch(result, hotel)
        );

      if (exactMatches.length === 1) {
        const coordinates = exactMatches[0].candidate;
        if (supportsCoordinateStorage) {
          await pool.query(
            `UPDATE public.sen
             SET latitude = $2, longitude = $3
             WHERE id = $1 AND latitude IS NULL AND longitude IS NULL`,
            [hotel.id, coordinates.latitude, coordinates.longitude]
          );
        }
        return {
          status: "resolved",
          location: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            address: coordinates.address
          }
        };
      }

      return {
        status: candidates.length ? "choose_location" : "unresolved",
        candidates
      };
    })();

    hotelLookups.set(cacheKey, {
      expiresAt: now() + HOTEL_LOOKUP_CACHE_MS,
      value: resultPromise
    });
    try {
      const value = await resultPromise;
      hotelLookups.set(cacheKey, {
        expiresAt: now() + HOTEL_LOOKUP_CACHE_MS,
        value: Promise.resolve(value)
      });
      return value;
    } catch (error) {
      hotelLookups.delete(cacheKey);
      throw error;
    }
  }

  async function geocodeAddress(queryValue) {
    if (
      typeof queryValue !== "string" ||
      queryValue.trim().length < 3 ||
      queryValue.trim().length > 200
    ) {
      return { status: "invalid", candidates: [] };
    }

    const query = queryValue.trim();
    const key = normalize(query);
    const cached = addressLookups.get(key);
    if (cached && cached.expiresAt > now()) return cached.value;
    if (cached) addressLookups.delete(key);

    const lookup = requestNominatim(query, true).then(results => {
      const candidates = results
        .map(toCandidate)
        .filter(candidate => candidate && candidate.address && isInCebu(candidate));
      return {
        status: candidates.length ? "choose_location" : "unresolved",
        candidates
      };
    });
    addressLookups.set(key, {
      expiresAt: now() + ADDRESS_LOOKUP_CACHE_MS,
      value: lookup
    });
    try {
      const value = await lookup;
      addressLookups.set(key, {
        expiresAt: now() + ADDRESS_LOOKUP_CACHE_MS,
        value: Promise.resolve(value)
      });
      return value;
    } catch (error) {
      addressLookups.delete(key);
      throw error;
    }
  }

  return { getHotelLocation, geocodeAddress };
}
