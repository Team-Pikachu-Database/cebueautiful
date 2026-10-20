import { randomUUID } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import { AuthError } from "./auth.js";
import { BookingError } from "./bookings.js";

const MAX_AUTH_BODY_BYTES = 8192;
const SESSION_COOKIE_NAME = "cebu_stays_session";

function publicStorageUrl(supabaseUrl, objectName) {
  const encodedPath = objectName.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/hotel-images/${encodedPath}`;
}

function mapHotel(row, imageRows, supabaseUrl) {
  const price = Number(row.price);
  const score = row.rating === null ? 0 : Number(row.rating);

  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(score)
  ) {
    throw new Error("Hotel catalogue contains an invalid value.");
  }

  let amenities = [];
  if (row.amenities) {
    try {
      const parsed = JSON.parse(row.amenities);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === "string")) {
        amenities = parsed;
      } else {
        amenities = row.amenities.split(",").map(item => item.trim()).filter(Boolean);
      }
    } catch {
      amenities = row.amenities.split(",").map(item => item.trim()).filter(Boolean);
    }
  }

  return {
    id: row.id.toString(),
    name: row.name,
    location: row.location,
    town: row.town,
    desc: row.description,
    amenities,
    price,
    score,
    reviews: row.review_count,
    images: imageRows.map(image => ({
      url: image.is_local
        ? `/${image.object_name}`
        : publicStorageUrl(supabaseUrl, image.object_name),
      alt: image.alt_text || `${row.name} photo ${image.sort_order}`
    }))
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const contentType = request.headers["content-type"]
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();

  if (contentType !== "application/json") {
    throw new AuthError(415, "Send the request as JSON.", "UNSUPPORTED_CONTENT_TYPE");
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_AUTH_BODY_BYTES) {
      throw new AuthError(413, "The request is too large.", "REQUEST_TOO_LARGE");
    }
    chunks.push(chunk);
  }

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AuthError(400, "Send valid JSON.", "INVALID_JSON");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AuthError(400, "Send a JSON object.", "INVALID_JSON_BODY");
  }

  return body;
}

function sessionTokenFromRequest(request) {
  for (const cookie of (request.headers.cookie ?? "").split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 0) continue;

    if (cookie.slice(0, separator).trim() === SESSION_COOKIE_NAME) {
      return cookie.slice(separator + 1).trim();
    }
  }

  return "";
}

function setSessionCookie(request, response, token, maxAge) {
  const forwardedProtocol = request.headers["x-forwarded-proto"]
    ?.split(",", 1)[0]
    .trim();
  const secure = request.socket.encrypted ||
    forwardedProtocol === "https" ||
    process.env.NODE_ENV === "production" ||
    /\.app\.github\.dev(?::\d+)?$/i.test(request.headers.host ?? "");
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`
  );
}

async function handleAuthRequest({ request, response, pathname, auth, requestId }) {
  if (!auth) {
    sendJson(response, 503, {
      error: "Account service is not configured.",
      requestId
    });
    return;
  }

  if (pathname === "/api/auth/me" && request.method === "GET") {
    const user = await auth.getSession(sessionTokenFromRequest(request));
    sendJson(response, 200, { user, requestId });
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST, OPTIONS");
    sendJson(response, 405, { error: "Method not allowed.", requestId });
    return;
  }

  try {
    if (pathname === "/api/auth/logout") {
      await auth.logout(sessionTokenFromRequest(request));
      setSessionCookie(request, response, "", 0);
      sendJson(response, 200, { ok: true, requestId });
      return;
    }

    const body = await readJsonBody(request);
    let result;
    let status = 200;
    if (pathname === "/api/auth/login") {
      result = await auth.login(body.email, body.password);
    } else if (pathname === "/api/auth/register") {
      result = await auth.registerStandard(body.email, body.password);
      status = 201;
    } else if (pathname === "/api/auth/developer/register") {
      result = await auth.registerDeveloper(body.email, body.password, body.inviteCode);
      status = 201;
    } else {
      sendJson(response, 404, { error: "Account route not found.", requestId });
      return;
    }

    setSessionCookie(request, response, result.token, auth.sessionTtlSeconds);
    sendJson(response, status, { user: result.user, requestId });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    if (status >= 500) {
      console.error(JSON.stringify({
        event: "account_request_failed",
        requestId,
        errorCode: error?.code ?? "UNEXPECTED"
      }));
    }
    sendJson(response, status, {
      error: error instanceof AuthError
        ? error.message
        : "The account request could not be completed.",
      requestId
    });
  }
}

function allowedOriginSet(configuredOrigins = "", codespaceName = "") {
  const origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5505",
    "http://127.0.0.1:5505",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://team-pikachu-database.github.io",
    ...configuredOrigins.split(",").map(origin => origin.trim()).filter(Boolean)
  ];

  if (/^[a-z0-9-]+$/i.test(codespaceName)) {
    origins.push(`https://${codespaceName}-5505.app.github.dev`);
  }

  return new Set(origins);
}

function isCodespacesPreviewOriginAllowed(origin, requestHost, apiPort) {
  try {
    const originUrl = new URL(origin);
    const originMatch = originUrl.hostname.match(
      /^(.*)-(\d+)\.app\.github\.dev$/
    );
    const requestMatch = requestHost.match(
      /^(.*)-(\d+)\.app\.github\.dev(?::\d+)?$/
    );

    return originUrl.protocol === "https:" &&
      originMatch !== null &&
      requestMatch !== null &&
      originMatch[1] === requestMatch[1] &&
      Number(requestMatch[2]) === apiPort;
  } catch {
    return false;
  }
}

function isCodespacesCatalogueOriginAllowed(origin, pathname, method) {
  if (pathname !== "/api/hotels" || !["GET", "OPTIONS"].includes(method)) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.protocol === "https:" &&
      originUrl.origin === origin &&
      /^[a-z0-9-]+-\d+\.app\.github\.dev$/i.test(originUrl.hostname);
  } catch {
    return false;
  }
}

export function createServer({
  prisma,
  configuredOrigins,
  codespaceName,
  supabaseUrl,
  auth,
  bookings,
  apiPort = 3000,
  logger = console.error
}) {
  const allowedOrigins = allowedOriginSet(configuredOrigins, codespaceName);

  return createHttpServer(async (request, response) => {
    const requestId = randomUUID();
    response.setHeader("X-Request-Id", requestId);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("X-Frame-Options", "DENY");

    let pathname;
    try {
      pathname = new URL(request.url, "http://localhost").pathname;
    } catch {
      sendJson(response, 400, { error: "Invalid request URL.", requestId });
      return;
    }

    const origin = request.headers.origin;
    if (origin) {
      if (
        !allowedOrigins.has(origin) &&
        !isCodespacesPreviewOriginAllowed(origin, request.headers.host ?? "", apiPort) &&
        !isCodespacesCatalogueOriginAllowed(origin, pathname, request.method)
      ) {
        sendJson(response, 403, { error: "Origin is not allowed.", requestId });
        return;
      }

      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.setHeader("Access-Control-Allow-Credentials", "true");
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    if (pathname.startsWith("/api/auth/")) {
      if (request.method === "POST" && !origin) {
        sendJson(response, 403, {
          error: "An allowed browser origin is required.",
          requestId
        });
        return;
      }
      await handleAuthRequest({ request, response, pathname, auth, requestId });
      return;
    }

    const availabilityMatch = pathname.match(/^\/api\/hotels\/([1-9]\d{0,18})\/availability$/);
    if (availabilityMatch || pathname === "/api/bookings") {
      if (!bookings) {
        sendJson(response, 503, { error: "Booking service is not configured.", requestId });
        return;
      }

      if (pathname === "/api/bookings" && request.method === "POST" && !origin) {
        sendJson(response, 403, {
          error: "An allowed browser origin is required.",
          requestId
        });
        return;
      }

      try {
        if (availabilityMatch && request.method === "GET") {
          const checkIn = new URL(request.url, "http://localhost").searchParams.get("checkIn");
          const checkOut = new URL(request.url, "http://localhost").searchParams.get("checkOut");
          const availability = await bookings.getAvailability(
            availabilityMatch[1],
            checkIn,
            checkOut
          );
          sendJson(response, 200, { availability, requestId });
          return;
        }

        if (pathname === "/api/bookings" && request.method === "POST") {
          const body = await readJsonBody(request);
          const booking = await bookings.createBooking(body);
          sendJson(response, 201, { booking, requestId });
          return;
        }

        response.setHeader("Allow", availabilityMatch ? "GET, OPTIONS" : "POST, OPTIONS");
        sendJson(response, 405, { error: "Method not allowed.", requestId });
      } catch (error) {
        const status = error instanceof BookingError || error instanceof AuthError
          ? error.status
          : 500;
        if (status >= 500) {
          logger(JSON.stringify({
            event: "booking_request_failed",
            requestId,
            errorCode: error?.code ?? "UNEXPECTED"
          }));
        }
        sendJson(response, status, {
          error: error instanceof BookingError || error instanceof AuthError
            ? error.message
            : "The booking request could not be completed.",
          requestId
        });
      }
      return;
    }

    if (pathname === "/api/hotels") {
      if (request.method !== "GET") {
        response.setHeader("Allow", "GET, OPTIONS");
        sendJson(response, 405, { error: "Method not allowed.", requestId });
        return;
      }

      try {
        const rows = await prisma.sen.findMany({
          select: {
            id: true,
            name: true,
            location: true,
            town: true,
            description: true,
            price: true,
            rating: true,
            review_count: true,
            amenities: true
          },
          orderBy: { name: "asc" }
        });
        const imageRows = typeof prisma.$queryRaw === "function"
          ? await prisma.$queryRaw`
              SELECT i.hotel_id, i.alt_text, i.sort_order,
                COALESCE(storage_image.name, i.storage_path) AS object_name,
                storage_image.name IS NULL AS is_local
              FROM public.sen_images AS i
              LEFT JOIN LATERAL (
                SELECT object.name
                FROM storage.objects AS object
                WHERE object.bucket_id = 'hotel-images'
                  AND object.name IN (
                    i.storage_path,
                    'Untitled folder/' || i.storage_path
                  )
                ORDER BY (object.name = i.storage_path) DESC
                LIMIT 1
              ) AS storage_image ON true
              WHERE storage_image.name IS NOT NULL
                OR i.storage_path ~ '^images[2-8]/[A-Za-z0-9._-]+[.]jpg$'
              ORDER BY i.hotel_id, i.sort_order, i.id
            `
          : [];
        const imagesByHotel = new Map();

        for (const image of imageRows) {
          const hotelId = image.hotel_id.toString();
          const hotelImages = imagesByHotel.get(hotelId) ?? [];
          hotelImages.push(image);
          imagesByHotel.set(hotelId, hotelImages);
        }

        const hotels = rows.map(row => mapHotel(
          row,
          imagesByHotel.get(row.id.toString()) ?? [],
          supabaseUrl
        ));

        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=60"
        });
        response.end(JSON.stringify({ hotels, requestId }));
      } catch (error) {
        logger(JSON.stringify({
          event: "hotel_catalogue_request_failed",
          requestId,
          errorCode: error?.code ?? "UNEXPECTED"
        }));
        sendJson(response, 503, {
          error: "The hotel catalogue is temporarily unavailable.",
          requestId
        });
      }
      return;
    }

    if (pathname === "/api/health") {
      if (request.method !== "GET") {
        response.setHeader("Allow", "GET, OPTIONS");
        sendJson(response, 405, { error: "Method not allowed.", requestId });
        return;
      }

      try {
        await prisma.$queryRaw`SELECT 1`;
        sendJson(response, 200, { status: "ok", requestId });
      } catch (error) {
        logger(JSON.stringify({
          event: "database_health_check_failed",
          requestId,
          errorCode: error?.code ?? "UNEXPECTED"
        }));
        sendJson(response, 503, {
          error: "The database is temporarily unavailable.",
          requestId
        });
      }
      return;
    }

    if (pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: "API route not found.", requestId });
      return;
    }

    if (request.method !== "GET") {
      sendJson(response, 404, { error: "Not found.", requestId });
      return;
    }

    sendJson(response, 404, { error: "Not found.", requestId });
  });
}
