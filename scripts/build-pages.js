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

for (const file of ["developer.html", "script.js", "developer.js", "map.js", "style.css"]) {
  fs.copyFileSync(path.join(projectRoot, file), path.join(outputDirectory, file));
}

const indexHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8")
  .replace(/style\.css\?v=[^"]+/, "style.css?v=20261104-cebustays-support-modal-v3")
  .replace(/script\.js\?v=[^"]+/, "script.js?v=20261104-cebustays-support-animation-v1");
fs.writeFileSync(path.join(outputDirectory, "index.html"), indexHtml);

fs.copyFileSync(
  path.join(projectRoot, "logo_folder", "cebustays.jpeg"),
  path.join(outputDirectory, "cebustays.jpeg")
);
fs.copyFileSync(
  path.join(projectRoot, "dashboard-background.png"),
  path.join(outputDirectory, "dashboard-background.png")
);
const heroImageDirectory = path.join(outputDirectory, "UI images");
fs.mkdirSync(heroImageDirectory, { recursive: true });
fs.copyFileSync(
  path.join(projectRoot, "UI images", "Luxury Lightning Lobby at Sunset.png"),
  path.join(heroImageDirectory, "Luxury Lightning Lobby at Sunset.png")
);
fs.copyFileSync(
  path.join(projectRoot, "UI images", "Golden Pikachu-Inspired Sunset Lounge.png"),
  path.join(heroImageDirectory, "Golden Pikachu-Inspired Sunset Lounge.png")
);
fs.copyFileSync(
  path.join(projectRoot, "UI images", "Pikachu-Inspired Geometric Dark Wallpaper (1).png"),
  path.join(heroImageDirectory, "Pikachu-Inspired Geometric Dark Wallpaper (1).png")
);
fs.copyFileSync(
  path.join(projectRoot, "UI images", "Electric Futuristic Dashboard Overlay.png"),
  path.join(heroImageDirectory, "Electric Futuristic Dashboard Overlay.png")
);
fs.copyFileSync(
  path.join(projectRoot, "UI images", "Golden-Hour Tropical Resort Coastline.png"),
  path.join(heroImageDirectory, "Golden-Hour Tropical Resort Coastline.png")
);
fs.copyFileSync(
  path.join(projectRoot, "UI images", "Luxurious Navy Gold Chat Bubble Frame.png"),
  path.join(heroImageDirectory, "Luxurious Navy Gold Chat Bubble Frame.png")
);
fs.copyFileSync(
  path.join(projectRoot, "UI images", "dizisprivatepwpoty.jpe"),
  path.join(heroImageDirectory, "dizisprivatepwpoty.jpe")
);
fs.copyFileSync(
  path.join(projectRoot, "UI images", "Elegant Blue and Gold Wave Background.png"),
  path.join(heroImageDirectory, "Elegant Blue and Gold Wave Background.png")
);
fs.copyFileSync(
  path.join(projectRoot, "UI images", "Luxury Prize Wheel Giveaway.png"),
  path.join(heroImageDirectory, "Luxury Prize Wheel Giveaway.png")
);
fs.copyFileSync(
  path.join(projectRoot, "UI images", "nya-removebg.png"),
  path.join(heroImageDirectory, "nya-removebg.png")
);
fs.copyFileSync(
  path.join(projectRoot, "UI images", "pokeball-transparent.png"),
  path.join(heroImageDirectory, "pokeball-transparent.png")
);
fs.cpSync(
  path.join(projectRoot, "UI images", "UI sounds"),
  path.join(heroImageDirectory, "UI sounds"),
  { recursive: true }
);

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