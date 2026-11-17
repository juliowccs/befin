import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const ROOT = process.cwd();
const NEXT_STATIC_DIR = path.join(ROOT, ".next", "static");
const NEXT_APP_SERVER_DIR = path.join(ROOT, ".next", "server", "app");
const NEXT_BUILD_ID_PATH = path.join(ROOT, ".next", "BUILD_ID");
const PUBLIC_ICONS_DIR = path.join(ROOT, "public", "icons");
const SW_ENTRY = path.join(ROOT, "src", "sw.ts");
const SW_OUT = path.join(ROOT, "public", "sw.js");

function walkFiles(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const rel = path.relative(baseDir, fullPath).split(path.sep).join("/");
      files.push({ fullPath, rel });
    }
  }
  return files;
}

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12);
}

function readBuildId() {
  if (fs.existsSync(NEXT_BUILD_ID_PATH)) {
    return fs.readFileSync(NEXT_BUILD_ID_PATH, "utf8").trim();
  }
  return crypto.randomBytes(6).toString("hex");
}

function collectPrecacheManifest() {
  const entries = [];
  const buildId = readBuildId();

  // App shell routes that exist as static/client pages so offline navigation works immediately
  const appRoutes = [
    "/inicio",
    "/caixinhas",
    "/extrato",
    "/conciliar",
    "/configuracoes",
  ];
  for (const route of appRoutes) {
    const htmlCandidate = path.join(
      NEXT_APP_SERVER_DIR,
      `${route.slice(1)}.html`,
    );
    if (fs.existsSync(htmlCandidate)) {
      entries.push({ url: route, revision: hashFile(htmlCandidate) });
    } else {
      entries.push({ url: route, revision: buildId });
    }
  }

  // Next.js static build chunks, CSS, and media
  for (const file of walkFiles(NEXT_STATIC_DIR)) {
    if (file.rel.endsWith(".map")) continue;
    // Skip Next.js internal build manifests that aren't fetched by browser
    if (
      file.rel.endsWith("_buildManifest.js") ||
      file.rel.endsWith("_ssgManifest.js") ||
      file.rel.endsWith("_clientMiddlewareManifest.js")
    ) {
      continue;
    }
    entries.push({
      url: `/_next/static/${file.rel}`,
      revision: hashFile(file.fullPath),
    });
  }

  // PWA icons and manifest
  for (const file of walkFiles(PUBLIC_ICONS_DIR)) {
    entries.push({
      url: `/icons/${file.rel}`,
      revision: hashFile(file.fullPath),
    });
  }

  const iconSvgPath = path.join(ROOT, "app", "icon.svg");
  if (fs.existsSync(iconSvgPath)) {
    entries.push({
      url: "/icon.svg",
      revision: hashFile(iconSvgPath),
    });
  }

  entries.push({
    url: "/manifest.webmanifest",
    revision: buildId,
  });

  return entries;
}

async function main() {
  const manifest = collectPrecacheManifest();

  await build({
    entryPoints: [SW_ENTRY],
    outfile: SW_OUT,
    bundle: true,
    minify: process.env.NODE_ENV !== "development",
    sourcemap: false,
    format: "iife",
    target: ["es2020"],
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV || "production",
      ),
      "self.__SW_MANIFEST": JSON.stringify(manifest),
    },
  });

  console.log(
    `[build-sw] Generated public/sw.js with ${manifest.length} precache entries.`,
  );
}

main().catch((err) => {
  console.error("[build-sw] Failed:", err);
  process.exit(1);
});
