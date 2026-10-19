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

test("GET /api/hotels returns local image paths for the frontend origin", async () => {
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: () => {},
    prisma: {
      $queryRaw: async () => [{
        hotel_id: 44n,
        alt_text: "Placeholder hotel photo",
        sort_order: 1,
        object_name: "images2/1.1.jpg",
        is_local: true
      }],
      sen: {
        findMany: async () => [{
          id: 44n,
          name: "Placeholder Hotel",
          location: "Cebu",
          town: "Cebu City",
          description: "Placeholder listing.",
          price: "900",
          rating: "8",
          review_count: 3,
          amenities: "Wi-Fi"
        }]
      }
    }
  });

  const response = await fetch(`${baseUrl}/api/hotels`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.hotels[0].images, [{
    url: "/images2/1.1.jpg",
    alt: "Placeholder hotel photo"
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

test("the GitHub Pages project origin can load the public catalogue", async () => {
  const origin = "https://team-pikachu-database.github.io";
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: () => {},
    prisma: { sen: { findMany: async () => [] } }
  });

  const response = await fetch(`${baseUrl}/api/hotels`, {
    headers: { Origin: origin }
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});

test("local Live Server origins can load the hosted catalogue", async () => {
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: () => {},
    prisma: { sen: { findMany: async () => [] } }
  });

  for (const origin of ["http://127.0.0.1:5500", "http://localhost:5500"]) {
    const response = await fetch(`${baseUrl}/api/hotels`, {
      headers: { Origin: origin }
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
  }
});

test("availability and booking routes serve date-specific rooms and reservation confirmations", async () => {
  const stay = {
    checkIn: "2027-05-10",
    checkOut: "2027-05-12"
  };
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: () => {},
    bookings: {
      getAvailability: async (hotelId, checkIn, checkOut) => ({
        hotelId,
        checkIn,
        checkOut,
        totalRooms: 5,
        bookedRooms: 2,
        availableRooms: 3
      }),
      createBooking: async input => ({
        reference: "CS-ABC123DEF456",
        hotelName: "Example Hotel",
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        rooms: input.rooms,
        totalPrice: 2500
      })
    },
    prisma: { sen: { findMany: async () => [] } }
  });

  const availabilityResponse = await fetch(
    `${baseUrl}/api/hotels/42/availability?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}`
  );
  const availabilityBody = await availabilityResponse.json();
  assert.equal(availabilityResponse.status, 200);
  assert.equal(availabilityBody.availability.availableRooms, 3);

  const reservationResponse = await fetch(`${baseUrl}/api/bookings`, {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:5505",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      hotelId: "42",
      ...stay,
      rooms: 1,
      guestName: "Cebu Guest",
      guestEmail: "guest@example.com"
    })
  });
  const reservationBody = await reservationResponse.json();
  assert.equal(reservationResponse.status, 201);
  assert.equal(reservationBody.booking.reference, "CS-ABC123DEF456");
  assert.equal(reservationBody.booking.totalPrice, 2500);
});

test("booking writes require an allowed browser origin", async () => {
  let createCalled = false;
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: () => {},
    bookings: {
      createBooking: async () => {
        createCalled = true;
        return {};
      },
      getAvailability: async () => ({})
    },
    prisma: { sen: { findMany: async () => [] } }
  });

  const response = await fetch(`${baseUrl}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  assert.equal(response.status, 403);
  assert.equal(createCalled, false);
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
  const missingAuthOriginResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });

  assert.equal(writeResponse.status, 405);
  assert.equal(originResponse.status, 403);
  assert.equal(missingAuthOriginResponse.status, 403);
});

test("account registration, session lookup, and logout use an HttpOnly cookie", async () => {
  const user = {
    id: "d7df71f3-8fca-498a-b91d-93370d05ec6a",
    email: "guest@example.com",
    role: "standard",
    createdAt: "2026-01-01T00:00:00.000Z"
  };
  let sessionToken = "";
  let sessionRevoked = false;
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: () => {},
    auth: {
      sessionTtlSeconds: 604800,
      registerStandard: async email => ({ user: { ...user, email }, token: "s".repeat(43) }),
      getSession: async token =>
        !sessionRevoked && token === "s".repeat(43) ? user : null,
      logout: async token => {
        sessionToken = token;
        sessionRevoked = true;
      }
    },
    prisma: { sen: { findMany: async () => [] } }
  });

  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:5505",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email: user.email, password: "a-long-and-unique-passphrase" })
  });
  const registrationBody = await registration.json();
  const cookie = registration.headers.get("set-cookie");

  assert.equal(registration.status, 201);
  assert.equal(registration.headers.get("access-control-allow-origin"), "http://127.0.0.1:5505");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.equal(registrationBody.user.role, "standard");
  assert.equal("token" in registrationBody, false);
  assert.equal(JSON.stringify(registrationBody).includes("password"), false);

  const session = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: `cebu_stays_session=${"s".repeat(43)}` }
  });
  assert.equal((await session.json()).user.email, user.email);

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:5505",
      Cookie: `cebu_stays_session=${"s".repeat(43)}`
    }
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal(sessionToken, "s".repeat(43));

  const afterLogout = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: `cebu_stays_session=${"s".repeat(43)}` }
  });
  assert.equal((await afterLogout.json()).user, null);
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

test("the API server does not serve frontend pages or local images", async () => {
  const baseUrl = await startServer({
    configuredOrigins: "",
    logger: () => {},
    prisma: { sen: { findMany: async () => [] } }
  });

  for (const pathname of ["/", "/index.html", "/images7/1.1.jpg"]) {
    const response = await fetch(`${baseUrl}${pathname}`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error, "Not found.");
  }
});
