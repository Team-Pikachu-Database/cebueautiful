import { createServer as createHttpServer, request as httpRequest } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const staticFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/config.js", ["config.js", "text/javascript; charset=utf-8"]],
  ["/script.js", ["script.js", "text/javascript; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]]
]);

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(body));
}

function allowedSiteOrigins(configuredOrigins = "", codespaceName = "") {
  const origins = [
    "http://localhost:5505",
    "http://127.0.0.1:5505",
    ...configuredOrigins.split(",").map(origin => origin.trim()).filter(Boolean)
  ];

  if (/^[a-z0-9-]+$/i.test(codespaceName)) {
    origins.push(`https://${codespaceName}-5505.app.github.dev`);
  }

  return new Set(origins);
}

function forwardApiRequest(request, response, { apiPort, frontendPort }) {
  const headers = { ...request.headers, host: `127.0.0.1:${apiPort}` };
  delete headers.connection;
  delete headers["transfer-encoding"];

  if (request.headers.origin) {
    headers.origin = `http://127.0.0.1:${frontendPort}`;
  }

  const upstream = httpRequest({
    hostname: "127.0.0.1",
    port: apiPort,
    method: request.method,
    path: request.url,
    headers
  }, upstreamResponse => {
    response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });

  upstream.on("error", () => {
    if (!response.headersSent) {
      sendJson(response, 502, { error: "The account and catalogue API is unavailable." });
    } else {
      response.destroy();
    }
  });

  request.pipe(upstream);
}

async function serveStatic(pathname, request, response) {
  let file = staticFiles.get(pathname);
  if (!file) {
    const imagePath = pathname.match(/^\/(images[2-8]?)\/([A-Za-z0-9._-]+\.jpg)$/);
    if (!imagePath) return false;
    file = [`${imagePath[1]}/${imagePath[2]}`, "image/jpeg"];
  }

  const content = await readFile(path.join(projectRoot, file[0]));
  response.writeHead(200, {
    "Content-Type": file[1],
    "Content-Length": content.length,
    "Cache-Control": file[1].startsWith("image/") ? "public, max-age=86400" : "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' https://*.supabase.co; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  });
  response.end(request.method === "HEAD" ? undefined : content);
  return true;
}

export function createSiteServer({
  apiPort = 3000,
  frontendPort = 5505,
  configuredOrigins,
  codespaceName,
  logger = console.error
} = {}) {
  const allowedOrigins = allowedSiteOrigins(configuredOrigins, codespaceName);

  return createHttpServer(async (request, response) => {
    let pathname;
    try {
      pathname = new URL(request.url, "http://localhost").pathname;
    } catch {
      sendJson(response, 400, { error: "Invalid request URL." });
      return;
    }

    if (pathname.startsWith("/api/")) {
      const origin = request.headers.origin;
      if (
        (origin && !allowedOrigins.has(origin)) ||
        (pathname.startsWith("/api/auth/") && request.method === "POST" && !origin)
      ) {
        sendJson(response, 403, { error: "An allowed browser origin is required." });
        return;
      }

      forwardApiRequest(request, response, { apiPort, frontendPort });
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 404, { error: "Not found." });
      return;
    }

    try {
      if (!(await serveStatic(pathname, request, response))) {
        sendJson(response, 404, { error: "Not found." });
      }
    } catch (error) {
      logger(JSON.stringify({
        event: "site_asset_request_failed",
        errorCode: error?.code ?? "UNEXPECTED"
      }));
      sendJson(response, 404, { error: "Not found." });
    }
  });
}