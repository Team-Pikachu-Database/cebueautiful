import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = path.join(projectRoot, "public-pages");

if (fs.existsSync(outputDirectory)) {
  throw new Error(
    "public-pages already exists; review it before moving or removing it, then retry the export."
  );
}

const build = spawnSync(
  process.execPath,
  [path.join(projectRoot, "scripts/build-pages.js")],
  {
    cwd: projectRoot,
    env: { ...process.env, REQUIRE_CEBUSTAYS_API: "true" },
    stdio: "inherit"
  }
);

if (build.error) throw build.error;
if (build.status !== 0) {
  throw new Error("Pages build failed; no public repository bundle was created.");
}

fs.cpSync(path.join(projectRoot, "dist"), outputDirectory, { recursive: true });
fs.cpSync(
  path.join(projectRoot, ".github/workflows/pages.yml"),
  path.join(outputDirectory, ".github/workflows/pages.yml"),
  { recursive: true }
);
fs.mkdirSync(path.join(outputDirectory, "scripts"), { recursive: true });
fs.copyFileSync(
  path.join(projectRoot, "scripts/build-pages.js"),
  path.join(outputDirectory, "scripts/build-pages.js")
);
fs.writeFileSync(
  path.join(outputDirectory, "package.json"),
  `${JSON.stringify({
    name: "cebueautiful-pages",
    version: "1.0.0",
    private: true,
    type: "module",
    scripts: { "build:pages": "node scripts/build-pages.js" }
  }, null, 2)}\n`
);
fs.writeFileSync(
  path.join(outputDirectory, "README.md"),
  "# CebuStays Pages Site\n\n" +
  "This repository contains only the static CebuStays frontend and images. " +
  "The backend remains in the private source repository.\n\n" +
  "Set the Actions variable `CEBUSTAYS_API_BASE_URL` to `https://api.pikachubookingsite.com`, " +
  "enable GitHub Pages with the GitHub Actions source, and configure `www.pikachubookingsite.com` in Pages settings.\n"
);

console.log(`Created static-only public repository bundle at ${outputDirectory}.`);