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
  const developerPageResponse = await fetch(`${baseUrl}/developer.html`);
  const developerHtml = await developerPageResponse.text();
  const developerScriptResponse = await fetch(`${baseUrl}/developer.js`);
  const githubLogoResponse = await fetch(`${baseUrl}/logo_folder/github.png`);
  const supabaseLogoResponse = await fetch(`${baseUrl}/logo_folder/supabase.jpeg`);
  const configResponse = await fetch(`${baseUrl}/config.js`);
  const imageResponse = await fetch(`${baseUrl}/images2/1.1.jpg`);

  assert.equal(pageResponse.status, 200);
  assert.match(html, /account-dialog/);
  assert.match(html, /id="booking-form"/);
  assert.match(html, /Confirm reservation/);
  assert.equal(developerPageResponse.status, 200);
  assert.match(developerHtml, /developer-destinations/);
  assert.match(
    developerHtml,
    /href="https:\/\/supabase\.com\/dashboard\/project\/jgsrgzrgiznknvtxhats"/
  );
  assert.match(developerHtml, /href="https:\/\/github\.com\/Team-Pikachu-Database"/);
  assert.match(developerHtml, /src="logo_folder\/github\.png"/);
  assert.match(developerHtml, /src="logo_folder\/supabase\.jpeg"/);
  assert.equal(developerScriptResponse.status, 200);
  assert.equal(githubLogoResponse.status, 200);
  assert.equal(githubLogoResponse.headers.get("content-type"), "image/png");
  assert.equal(supabaseLogoResponse.status, 200);
  assert.equal(supabaseLogoResponse.headers.get("content-type"), "image/jpeg");
  assert.match(
    pageResponse.headers.get("content-security-policy"),
    /img-src 'self' https:\/\/\*\.supabase\.co/
  );
  assert.equal(configResponse.status, 200);
  assert.match(await configResponse.text(), /CEBUSTAYS_CONFIG/);
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
