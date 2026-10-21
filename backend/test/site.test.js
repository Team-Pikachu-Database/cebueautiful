import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer as createHttpServer } from "node:http";
import { afterEach, test } from "node:test";
import { createSiteServer } from "../src/site.js";

const servers = new Set();

async function listen(server) {
  servers.add(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

afterEach(async () => {
  await Promise.all([...servers].map(server => new Promise(resolve => {
    server.close(resolve);
  })));
  servers.clear();
});

test("the site serves the frontend and local hotel photos with a Supabase image CSP", async () => {
  const baseUrl = await listen(createSiteServer({ logger: () => {} }));
  const pageResponse = await fetch(baseUrl);
  const html = await pageResponse.text();
  const pageScriptResponse = await fetch(`${baseUrl}/script.js`);
  const pageScript = await pageScriptResponse.text();
  const mapScriptResponse = await fetch(`${baseUrl}/map.js`);
  const mapScript = await mapScriptResponse.text();
  const developerPageResponse = await fetch(`${baseUrl}/developer.html`);
  const developerHtml = await developerPageResponse.text();
  const developerScriptResponse = await fetch(`${baseUrl}/developer.js`);
  const developerScript = await developerScriptResponse.text();
  const githubLogoResponse = await fetch(`${baseUrl}/logo_folder/github.png`);
  const supabaseLogoResponse = await fetch(`${baseUrl}/logo_folder/supabase.jpeg`);
  const configResponse = await fetch(`${baseUrl}/config.js`);
  const configScript = await configResponse.text();
  const imageResponse = await fetch(`${baseUrl}/images2/1.1.jpg`);

  assert.equal(pageResponse.status, 200);
  assert.match(html, /map\.js\?v=hotel-directions-api-v2/);
  assert.match(html, /script\.js\?v=hotel-directions-api-v2/);
  assert.match(html, /style\.css\?v=hotel-directions-api-v2/);
  assert.match(html, /account-dialog/);
  assert.match(html, /id="booking-form"/);
  assert.match(html, /pending until a developer confirms your payment/);
  assert.match(html, /Submit reservation/);
  assert.equal(pageScriptResponse.status, 200);
  assert.match(pageScript, /Pending payment/);
  assert.equal(mapScriptResponse.status, 200);
  assert.match(mapScript, /CebuStaysMap/);
  assert.match(mapScript, /credentials:\s*options\.credentials\s*\?\?\s*"include"/);
  assert.match(mapScript, /credentials:\s*"omit"/);
  assert.match(mapScript, /Retry hotel lookup/);
  assert.match(mapScript, /No drivable road connects your starting point/);
  assert.match(mapScript, /hotel-map-marker-pin/);
  assert.match(mapScript, /server\.arcgisonline\.com/);
  assert.match(html, /data-location-choice="always"/);
  assert.match(html, /data-location-choice="session"/);
  assert.match(html, /data-location-choice="denied"/);
  assert.match(html, /Map tiles © Esri and GIS User Community/);
  assert.equal(developerPageResponse.status, 200);
  assert.match(developerHtml, /developer-destinations/);
  assert.match(developerHtml, /id="developer-bookings"/);
  assert.match(developerHtml, /class="developer-bookings-table"/);
  assert.match(developerHtml, /id="payment-review-dialog"/);
  assert.match(developerHtml, /id="payment-review-checked"/);
  assert.match(developerHtml, /Mark as paid/);
  assert.match(
    developerHtml,
    /href="https:\/\/supabase\.com\/dashboard\/project\/jgsrgzrgiznknvtxhats"/
  );
  assert.match(developerHtml, /href="https:\/\/github\.com\/Team-Pikachu-Database"/);
  assert.match(developerHtml, /src="logo_folder\/github\.png"/);
  assert.match(developerHtml, /src="logo_folder\/supabase\.jpeg"/);
  assert.equal(developerScriptResponse.status, 200);
  assert.match(developerScript, /\/api\/bookings\/pending/);
  assert.match(developerScript, /Check details/);
  assert.equal(githubLogoResponse.status, 200);
  assert.equal(githubLogoResponse.headers.get("content-type"), "image/png");
  assert.equal(supabaseLogoResponse.status, 200);
  assert.equal(supabaseLogoResponse.headers.get("content-type"), "image/jpeg");
  assert.match(
    pageResponse.headers.get("content-security-policy"),
    /img-src 'self' https:\/\/\*\.supabase\.co/
  );
  assert.match(pageResponse.headers.get("content-security-policy"), /img-src[^;]*https:\/\/unpkg\.com/);
  assert.match(pageResponse.headers.get("content-security-policy"), /https:\/\/server\.arcgisonline\.com/);
  assert.match(pageResponse.headers.get("content-security-policy"), /https:\/\/router\.project-osrm\.org/);
  assert.equal(configResponse.status, 200);
  assert.match(configScript, /CEBUSTAYS_CONFIG/);
  assert.match(configScript, /apiBaseUrl: ""/);
  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers.get("content-type"), "image/jpeg");
});

test("the site proxies Codespaces API requests to the local API origin", async () => {
  const upstream = createHttpServer((request, response) => {
    response.setHeader("Set-Cookie", "cebu_stays_session=test; HttpOnly");
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({
      path: request.url,
      origin: request.headers.origin,
      host: request.headers.host,
      cookie: request.headers.cookie
    }));
  });
  const upstreamUrl = await listen(upstream);
  const apiPort = new URL(upstreamUrl).port;
  const baseUrl = await listen(createSiteServer({
    apiPort,
    frontendPort: 5505,
    codespaceName: "ideal-acorn-jr5xjggj7xrx3qpwj",
    logger: () => {}
  }));

  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: {
      Origin: "https://ideal-acorn-jr5xjggj7xrx3qpwj-5505.app.github.dev",
      Cookie: "cebu_stays_session=browser-session"
    }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.path, "/api/auth/me");
  assert.equal(body.origin, `http://127.0.0.1:${apiPort}`);
  assert.equal(body.host, `127.0.0.1:${apiPort}`);
  assert.equal(body.cookie, "cebu_stays_session=browser-session");
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
});

test("the site proxies location API requests from its paired Codespaces Live Server port", async () => {
  const upstream = createHttpServer((request, response) => {
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "http://127.0.0.1:3101",
      "Access-Control-Allow-Credentials": "true"
    });
    response.end(JSON.stringify({
      path: request.url,
      origin: request.headers.origin
    }));
  });
  const upstreamUrl = await listen(upstream);
  const apiPort = new URL(upstreamUrl).port;
  const codespaceName = "ideal-acorn-jr5xjggj7xrx3qpwj";
  const siteUrl = await listen(createSiteServer({
    apiPort,
    frontendPort: 5505,
    codespaceName,
    logger: () => {}
  }));

  const response = await fetch(`${siteUrl}/api/hotels/15151522/location`, {
    headers: {
      Origin: `https://${codespaceName}-5506.app.github.dev`
    }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.path, "/api/hotels/15151522/location");
  assert.equal(body.origin, `http://127.0.0.1:${apiPort}`);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    `https://${codespaceName}-5506.app.github.dev`
  );
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});

test("the site accepts login requests from localhost Live Server on port 5506", async () => {
  const upstream = createHttpServer((request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ origin: request.headers.origin }));
  });
  const upstreamUrl = await listen(upstream);
  const apiPort = new URL(upstreamUrl).port;
  const siteUrl = await listen(createSiteServer({ apiPort, logger: () => {} }));

  const response = await fetch(`${siteUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      Origin: "http://localhost:5506",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email: "guest@example.com", password: "test" })
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).origin, `http://127.0.0.1:${apiPort}`);
});

test("the site rejects cross-origin and originless account writes", async () => {
  const upstream = createHttpServer((request, response) => response.end("unexpected"));
  const upstreamUrl = await listen(upstream);
  const siteUrl = await listen(createSiteServer({
    apiPort: new URL(upstreamUrl).port,
    codespaceName: "ideal-acorn-jr5xjggj7xrx3qpwj",
    logger: () => {}
  }));

  const untrusted = await fetch(`${siteUrl}/api/auth/register`, {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example",
      "Content-Type": "application/json"
    },
    body: "{}"
  });
  const originless = await fetch(`${siteUrl}/api/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });

  assert.equal(untrusted.status, 403);
  assert.equal(originless.status, 403);
});
