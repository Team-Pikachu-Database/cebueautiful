import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const staticFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/script.js", ["script.js", "text/javascript; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]]
]);

function mapHotel(row) {
  const price = Number(row.price);
  const score = row.rating === null ? 0 : Number(row.rating);
  const imageFolderIsValid = /^images[2-6]?$/.test(row.image_folder);
  const imagePrefix = Number(row.image_prefix);
  const imageCount = Number(row.image_count);

  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(score) ||
    !imageFolderIsValid ||
    !Number.isInteger(imagePrefix) ||
    imagePrefix < 1 ||
    !Number.isInteger(imageCount) ||
    imageCount < 1 ||
    imageCount > 200
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
    imagePrefix: String(imagePrefix),
    imageFolder: row.image_folder,
    imageCount
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

function allowedOriginSet(configuredOrigins = "") {
  const origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5505",
    "http://127.0.0.1:5505",
    ...configuredOrigins.split(",").map(origin => origin.trim()).filter(Boolean)
  ];

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

async function serveStatic(pathname, response) {
  let file = staticFiles.get(pathname);

  if (!file) {
    const imagePath = pathname.match(/^\/(images[2-7]?)\/([A-Za-z0-9._-]+\.jpg)$/);
    if (!imagePath) return false;
    file = [`${imagePath[1]}/${imagePath[2]}`, "image/jpeg"];
  }

  const absolutePath = path.join(projectRoot, file[0]);
  const content = await readFile(absolutePath);

  response.writeHead(200, {
    "Content-Type": file[1],
    "Cache-Control": file[1].startsWith("image/") ? "public, max-age=86400" : "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'"
  });
  response.end(content);
  return true;
}

export function createServer({
  prisma,
  configuredOrigins,
  apiPort = 3000,
  logger = console.error
}) {
  const allowedOrigins = allowedOriginSet(configuredOrigins);

  return createHttpServer(async (request, response) => {
    const requestId = randomUUID();
    response.setHeader("X-Request-Id", requestId);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("X-Frame-Options", "DENY");

    const origin = request.headers.origin;
    if (origin) {
      if (
        !allowedOrigins.has(origin) &&
        !isCodespacesPreviewOriginAllowed(origin, request.headers.host ?? "", apiPort)
      ) {
        sendJson(response, 403, { error: "Origin is not allowed.", requestId });
        return;
      }

      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    }

    let pathname;
    try {
      pathname = new URL(request.url, "http://localhost").pathname;
    } catch {
      sendJson(response, 400, { error: "Invalid request URL.", requestId });
      return;
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
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
            amenities: true,
            image_folder: true,
            image_prefix: true,
            image_count: true
          },
          orderBy: { name: "asc" }
        });
        const hotels = rows.map(mapHotel);

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

    try {
      if (!(await serveStatic(pathname, response))) {
        sendJson(response, 404, { error: "Not found.", requestId });
      }
    } catch (error) {
      logger(JSON.stringify({
        event: "static_asset_request_failed",
        requestId,
        errorCode: error?.code ?? "UNEXPECTED"
      }));
      sendJson(response, 500, { error: "Unable to serve this asset.", requestId });
    }
  });
}
