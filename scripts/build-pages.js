import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = path.join(projectRoot, "dist");
const configuredApiUrl = process.env.CEBUSTAYS_API_BASE_URL?.trim() ?? "";
const configuredSiteDomain = process.env.CEBUSTAYS_SITE_DOMAIN?.trim() ?? "";
const requireHttpsApi = process.env.REQUIRE_CEBUSTAYS_API === "true";

if (requireHttpsApi && !configuredApiUrl) {
  throw new Error(
    "Set the CEBUSTAYS_API_BASE_URL repository variable to your HTTPS API origin before deploying GitHub Pages."
  );
}

let apiBaseUrl = "";
if (configuredApiUrl) {
  let apiUrl;
  try {
    apiUrl = new URL(configuredApiUrl);
  } catch {
    throw new Error("CEBUSTAYS_API_BASE_URL must be an absolute HTTPS API origin.");
  }

  if (
    (requireHttpsApi && apiUrl.protocol !== "https:") ||
    !["https:", "http:"].includes(apiUrl.protocol) ||
    apiUrl.username ||
    apiUrl.password ||
    apiUrl.pathname !== "/" ||
    apiUrl.search ||
    apiUrl.hash
  ) {
    throw new Error("CEBUSTAYS_API_BASE_URL must be an origin only, without a path or credentials.");
  }

  apiBaseUrl = apiUrl.origin;
}

fs.mkdirSync(outputDirectory, { recursive: true });

for (const file of ["index.html", "developer.html", "script.js", "developer.js", "style.css"]) {
  fs.copyFileSync(path.join(projectRoot, file), path.join(outputDirectory, file));
}

fs.copyFileSync(path.join(projectRoot, "plane.png"), path.join(outputDirectory, "plane.png"));

fs.cpSync(
  path.join(projectRoot, "logo_folder"),
  path.join(outputDirectory, "logo_folder"),
  { recursive: true }
);

for (const directory of [
  "images",
  "images2",
  "images3",
  "images4",
  "images5",
  "images6",
  "images7",
  "images8"
]) {
  fs.cpSync(
    path.join(projectRoot, directory),
    path.join(outputDirectory, directory),
    { recursive: true }
  );
}

fs.writeFileSync(
  path.join(outputDirectory, "config.js"),
  `window.CEBUSTAYS_CONFIG = Object.freeze({ apiBaseUrl: ${JSON.stringify(apiBaseUrl)} });\n`
);

if (configuredSiteDomain) {
  const domain = configuredSiteDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!/^[a-z0-9.-]+$/i.test(domain) || domain.includes("..")) {
    throw new Error("CEBUSTAYS_SITE_DOMAIN must be a hostname only.");
  }
  fs.writeFileSync(path.join(outputDirectory, "CNAME"), `${domain}\n`);
} else {
  fs.rmSync(path.join(outputDirectory, "CNAME"), { force: true });
}

console.log(`GitHub Pages site built in ${outputDirectory}`);
console.log(`API origin: ${apiBaseUrl || "same-origin (local development only)"}`);