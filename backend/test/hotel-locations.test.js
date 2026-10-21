import assert from "node:assert/strict";
import { test } from "node:test";
import { createHotelLocationService } from "../src/hotel-locations.js";

function geocoderResponse(results, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => results
  };
}

function result({
  placeId,
  name,
  town = "Cebu City",
  latitude,
  longitude
}) {
  return {
    place_id: placeId,
    name,
    lat: String(latitude),
    lon: String(longitude),
    display_name: `${name}, ${town}, Cebu, Philippines`,
    address: {
      city: town,
      country_code: "ph"
    }
  };
}

test("a single exact Cebu hotel match is saved and cached", async () => {
  const queries = [];
  const fetchCalls = [];
  const pool = {
    query: async (query, parameters) => {
      queries.push({ query, parameters });
      if (query.includes("SELECT")) {
        return {
          rows: [{
            id: "42",
            name: "Cebu Hotel",
            location: "Downtown",
            town: "Cebu City",
            latitude: null,
            longitude: null
          }]
        };
      }
      return { rows: [] };
    }
  };
  const service = createHotelLocationService({
    pool,
    minimumRequestIntervalMs: 0,
    fetchImpl: async (url, options) => {
      fetchCalls.push({ url: new URL(url), options });
      return geocoderResponse([
        result({
          placeId: 1,
          name: "Cebu Hotel",
          latitude: 10.315,
          longitude: 123.885
        })
      ]);
    }
  });

  const first = await service.getHotelLocation("42");
  const second = await service.getHotelLocation("42");

  assert.equal(first.status, "resolved");
  assert.deepEqual(first.location, {
    latitude: 10.315,
    longitude: 123.885,
    address: "Cebu Hotel, Cebu City, Cebu, Philippines"
  });
  assert.deepEqual(second, first);
  assert.equal(fetchCalls.length, 1);
  assert.equal(queries.filter(({ query }) => query.includes("UPDATE")).length, 1);
  assert.equal(queries[1].parameters[0], "42");
  assert.match(fetchCalls[0].url.searchParams.get("q"), /^Cebu Hotel, Cebu City,/);
  assert.equal(fetchCalls[0].url.searchParams.get("bounded"), "1");
  assert.match(fetchCalls[0].options.headers["User-Agent"], /CebuStays/);
});

test("ambiguous hotel matches are returned as choices and are not saved", async () => {
  let updateCount = 0;
  const pool = {
    query: async query => {
      if (query.includes("SELECT")) {
        return {
          rows: [{
            id: "43",
            name: "Cebu Hotel",
            location: "Downtown",
            town: "Cebu City",
            latitude: null,
            longitude: null
          }]
        };
      }
      updateCount += 1;
      return { rows: [] };
    }
  };
  const service = createHotelLocationService({
    pool,
    minimumRequestIntervalMs: 0,
    fetchImpl: async () => geocoderResponse([
      result({ placeId: 1, name: "Cebu Hotel", latitude: 10.31, longitude: 123.88 }),
      result({ placeId: 2, name: "Cebu Hotel", latitude: 10.32, longitude: 123.89 })
    ])
  });

  const response = await service.getHotelLocation("43");

  assert.equal(response.status, "choose_location");
  assert.equal(response.candidates.length, 2);
  assert.equal(updateCount, 0);
});

test("hotel geocoding works before coordinate columns are migrated", async () => {
  const queries = [];
  const pool = {
    query: async query => {
      queries.push(query);
      if (queries.length === 1) {
        const error = new Error('column "latitude" does not exist');
        error.code = "42703";
        throw error;
      }
      return {
        rows: [{
          id: "44",
          name: "Cebu Hotel",
          location: "Downtown",
          town: "Cebu City"
        }]
      };
    }
  };
  const service = createHotelLocationService({
    pool,
    minimumRequestIntervalMs: 0,
    fetchImpl: async () => geocoderResponse([
      result({ placeId: 1, name: "Cebu Hotel", latitude: 10.31, longitude: 123.88 })
    ])
  });

  const response = await service.getHotelLocation("44");

  assert.equal(response.status, "resolved");
  assert.deepEqual(response.location, {
    latitude: 10.31,
    longitude: 123.88,
    address: "Cebu Hotel, Cebu City, Cebu, Philippines"
  });
  assert.equal(queries.length, 2);
  assert.match(queries[1], /SELECT id::text AS id, name, location, town\s+FROM public\.sen/);
  assert.equal(queries.some(query => query.includes("UPDATE public.sen")), false);
});

test("manual origin lookups return only Cebu choices and use a short-lived cache", async () => {
  const calls = [];
  let now = 100;
  const service = createHotelLocationService({
    pool: {},
    minimumRequestIntervalMs: 0,
    now: () => now,
    fetchImpl: async url => {
      const parsedUrl = new URL(url);
      calls.push(parsedUrl);
      return geocoderResponse([
        result({ placeId: 1, name: "Cebu Origin", latitude: 10.31, longitude: 123.88 }),
        result({
          placeId: 2,
          name: "Manila Origin",
          town: "Manila",
          latitude: 14.6,
          longitude: 120.98
        })
      ]);
    }
  });

  const first = await service.geocodeAddress("Cebu City");
  const cached = await service.geocodeAddress(" Cebu City ");
  now += 10 * 60 * 1000 + 1;
  await service.geocodeAddress("Cebu City");

  assert.equal(first.status, "choose_location");
  assert.equal(first.candidates.length, 1);
  assert.equal(first.candidates[0].name, "Cebu Origin");
  assert.deepEqual(cached, first);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].searchParams.get("bounded"), "1");
  assert.equal(calls[0].searchParams.get("countrycodes"), "ph");
});

test("failed geocoder requests are not cached", async () => {
  let calls = 0;
  const service = createHotelLocationService({
    pool: {},
    minimumRequestIntervalMs: 0,
    fetchImpl: async () => {
      calls += 1;
      return calls === 1
        ? geocoderResponse([], 503)
        : geocoderResponse([]);
    }
  });

  await assert.rejects(service.geocodeAddress("Cebu City"), /HTTP 503/);
  assert.deepEqual(await service.geocodeAddress("Cebu City"), {
    status: "unresolved",
    candidates: []
  });
  assert.equal(calls, 2);
});
