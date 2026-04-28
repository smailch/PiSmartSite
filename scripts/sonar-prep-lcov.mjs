/**
 * Ajuste les chemins des SF: dans lcov.info pour qu'ils correspondent à la base du monorepo
 * (Jest: SF:src\… → smartsite-backend\… ; Vitest: chemins relatifs au front → smarsite-frontend\…).
 * Sans ce préfixe, SonarQube ne peut pas rattacher la couverture aux fichiers indexés.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, sep, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const backendLcov = join(root, "smartsite-backend", "coverage", "lcov.info");
const frontendLcov = join(root, "smarsite-frontend", "coverage", "lcov.info");

function transformBackend(s) {
  return s
    .replace(/^SF:src[\\/]/gm, `SF:smartsite-backend${sep}src${sep}`)
    .replace(
      /^SF:smartsite-backend[\\/]smartsite-backend[\\/]/gm,
      "SF:smartsite-backend/",
    );
}

function transformFrontend(s) {
  const feRoot = "smarsite-frontend" + sep;
  const out = s.split("\n");
  for (let i = 0; i < out.length; i++) {
    const line = out[i];
    if (!line.startsWith("SF:")) continue;
    const raw = line.slice(3);
    if (raw.includes("smarsite-frontend") || raw.includes("smarSite-frontend")) {
      out[i] = "SF:" + normalize(raw);
      continue;
    }
    const p = feRoot + raw.replace(/^\.\/+/, "");
    out[i] = "SF:" + p;
  }
  return out.join("\n");
}

/** Retire les blocs LCOV dont le fichier SF: n’existe plus (évite les WARN côté Sonar). */
function stripStaleRecords(lcov, rootDir) {
  const parts = lcov.split(/\nend_of_record\n?/);
  const kept = [];
  for (const part of parts) {
    const block = part.trim();
    if (!block) continue;
    const m = block.match(/^SF:(.+)$/m);
    if (!m) {
      kept.push(block);
      continue;
    }
    const rel = m[1].trim().replace(/\\/g, "/");
    const abs = resolve(rootDir, rel);
    if (existsSync(abs)) {
      kept.push(block);
    }
  }
  return kept.join("\nend_of_record\n") + (kept.length ? "\nend_of_record\n" : "");
}

const mergedParts = [];

for (const [path, fn, label] of [
  [backendLcov, transformBackend, "backend"],
  [frontendLcov, transformFrontend, "frontend"],
]) {
  let content;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  const updated = fn(content);
  writeFileSync(path, updated, "utf8");
  mergedParts.push(updated);
  console.log(
    "sonar-prep-lcov: mis à jour",
    relative(root, path),
    `(${label})`,
  );
}

if (mergedParts.length > 0) {
  const outDir = join(root, "coverage");
  const outFile = join(outDir, "lcov.info");
  mkdirSync(outDir, { recursive: true });
  const merged = stripStaleRecords(mergedParts.join("\n"), root);
  writeFileSync(outFile, merged, "utf8");
  console.log("sonar-prep-lcov: fusion racine", relative(root, outFile));
}
