import assert from "node:assert/strict";
import { once } from "node:events";
import { request as httpRequest } from "node:http";
import { afterEach, test } from "node:test";
import { createServer } from "../src/server.js";

const servers = new Set();

async function startServer(options) {
  const server = createServer(options);
  servers.add(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

function requestFromOrigin(url, host, origin) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, {
      headers: { host, origin }
    }, response => {
      response.resume();
      response.on("end", () => resolve(response));
    });
    request.on("error", reject);
    request.end();
  });
}

afterEach(async () => {
  await Promise.all([...servers].map(server => new Promise(resolve => {
    server.close(resolve);
  })));
  servers.clear();
});

test("GET /api/hotels returns the database catalogue in the frontend shape", async () => {
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: () => {},
    prisma: {
      sen: {
        findMany: async options => {
          assert.deepEqual(options.orderBy, { name: "asc" });
          assert.equal(options.select.price, true);
          return [{
            id: 42n,
            name: "Example Hotel",
            location: "Downtown",
            town: "Cebu City",
            description: "A test listing.",
            price: "1250.50",
            rating: "8.5",
            review_count: 12,
            amenities: "[\"Wi-Fi\",\"Pool\"]",
            image_folder: "images",
            image_prefix: 1,
            image_count: 5
          }];
        }
      }
    }
  });

  const response = await fetch(`${baseUrl}/api/hotels`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("x-request-id"), /^[0-9a-f-]{36}$/);
  assert.deepEqual(body.hotels, [{
    id: "42",
    name: "Example Hotel",
    location: "Downtown",
    town: "Cebu City",
    desc: "A test listing.",
    amenities: ["Wi-Fi", "Pool"],
    price: 1250.5,
    score: 8.5,
    reviews: 12,
    imagePrefix: "1",
    imageFolder: "images",
    imageCount: 5
  }]);
});

test("GET /api/hotels returns a safe error when the database is unavailable", async () => {
  const logged = [];
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: entry => logged.push(JSON.parse(entry)),
    prisma: { sen: { findMany: async () => { throw new Error("private database detail"); } } }
  });

  const response = await fetch(`${baseUrl}/api/hotels`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error, "The hotel catalogue is temporarily unavailable.");
  assert.equal(JSON.stringify(body).includes("private database detail"), false);
  assert.equal(logged.length, 1);
  assert.equal(logged[0].event, "hotel_catalogue_request_failed");
});

test("API rejects writes and disallowed browser origins", async () => {
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: () => {},
    prisma: { sen: { findMany: async () => [] } }
  });

  const writeResponse = await fetch(`${baseUrl}/api/hotels`, { method: "POST" });
  const originResponse = await fetch(`${baseUrl}/api/hotels`, {
    headers: { Origin: "https://untrusted.example" }
  });

  assert.equal(writeResponse.status, 405);
  assert.equal(originResponse.status, 403);
});

test("Codespaces preview API accepts only the matching workspace origin", async () => {
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: () => {},
    prisma: { sen: { findMany: async () => [] } }
  });
  const forwardedHost = "ideal-acorn-123-3000.app.github.dev";

  const matchingResponse = await requestFromOrigin(
    `${baseUrl}/api/hotels`,
    forwardedHost,
    "https://ideal-acorn-123-5505.app.github.dev"
  );
  const differentWorkspaceResponse = await requestFromOrigin(
    `${baseUrl}/api/hotels`,
    forwardedHost,
    "https://other-workspace-123-5505.app.github.dev"
  );

  assert.equal(matchingResponse.statusCode, 200);
  assert.equal(
    matchingResponse.headers["access-control-allow-origin"],
    "https://ideal-acorn-123-5505.app.github.dev"
  );
  assert.equal(differentWorkspaceResponse.statusCode, 403);
});

test("GET /api/health verifies its database connection", async () => {
  let queryCalled = false;
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: () => {},
    prisma: {
      $queryRaw: async () => {
        queryCalled = true;
        return [{ "?column?": 1 }];
      },
      sen: { findMany: async () => [] }
    }
  });

  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(queryCalled, true);
  assert.equal(body.status, "ok");
});

test("GET /api/health returns an unavailable status when the database check fails", async () => {
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: () => {},
    prisma: {
      $queryRaw: async () => { throw new Error("private database detail"); },
      sen: { findMany: async () => [] }
    }
  });

  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error, "The database is temporarily unavailable.");
  assert.equal(JSON.stringify(body).includes("private database detail"), false);
});

test("the Node server serves the existing frontend with a restrictive CSP", async () => {
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: () => {},
    prisma: { sen: { findMany: async () => [] } }
  });

  const response = await fetch(baseUrl);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /CebuStays/);
  assert.match(
    response.headers.get("content-security-policy"),
    /default-src 'self'/
  );
});

test("the Node server serves images for the additional hotel listing", async () => {
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: () => {},
    prisma: { sen: { findMany: async () => [] } }
  });

  const response = await fetch(`${baseUrl}/images7/1.1.jpg`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
});
