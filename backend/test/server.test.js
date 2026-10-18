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
    supabaseUrl: "https://example.supabase.co",
    logger: () => {},
    prisma: {
      $queryRaw: async () => [{
        hotel_id: 42n,
        alt_text: "Hotel exterior",
        sort_order: 1,
        object_name: "Untitled folder/hotels/42/1.1.jpg"
      }],
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
            amenities: "[\"Wi-Fi\",\"Pool\"]"
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
    images: [{
      url: "https://example.supabase.co/storage/v1/object/public/hotel-images/Untitled%20folder/hotels/42/1.1.jpg",
      alt: "Hotel exterior"
    }]
  }]);
});

test("GET /api/hotels returns Supabase Storage images for a hotel", async () => {
  const baseUrl = await startServer({
    configuredOrigins: "",
    supabaseUrl: "https://example.supabase.co",
    logger: () => {},
    prisma: {
      $queryRaw: async () => [{
        hotel_id: 43n,
        alt_text: "Pool",
        sort_order: 1,
        object_name: "hotels/43/pool.jpg"
      }],
      sen: {
        findMany: async () => [{
          id: 43n,
          name: "Another Hotel",
          location: "Cebu",
          town: "Cebu City",
          description: "Another test listing.",
          price: "900",
          rating: "8",
          review_count: 3,
          amenities: "Wi-Fi"
        }]
      }
    }
  });

  const catalogueResponse = await fetch(`${baseUrl}/api/hotels`);
  const catalogue = await catalogueResponse.json();

  assert.equal(catalogueResponse.status, 200);
  assert.deepEqual(catalogue.hotels[0].images, [{
    url: "https://example.supabase.co/storage/v1/object/public/hotel-images/hotels/43/pool.jpg",
    alt: "Pool"
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

test("Codespaces preview API accepts its origin when the proxy rewrites the host", async () => {
  const baseUrl = await startServer({
    configuredOrigins: "",
    codespaceName: "ideal-acorn-123",
    logger: () => {},
    prisma: { sen: { findMany: async () => [] } }
  });

  const matchingResponse = await requestFromOrigin(
    `${baseUrl}/api/hotels`,
    "127.0.0.1:3000",
    "https://ideal-acorn-123-5505.app.github.dev"
  );
  const differentWorkspaceResponse = await requestFromOrigin(
    `${baseUrl}/api/hotels`,
    "127.0.0.1:3000",
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
