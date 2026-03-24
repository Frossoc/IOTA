import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();

function resolveTsPath(candidatePath) {
  const withTs = `${candidatePath}.ts`;
  const withTsx = `${candidatePath}.tsx`;
  const withIndexTs = path.join(candidatePath, "index.ts");
  const withIndexTsx = path.join(candidatePath, "index.tsx");

  return [withTs, withTsx, withIndexTs, withIndexTsx];
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier === "next/server") {
    return defaultResolve("next/server.js", context, defaultResolve);
  }

  if (specifier.startsWith("@/app/")) {
    const relativePath = specifier.slice("@/app/".length);
    for (const candidate of resolveTsPath(path.join(projectRoot, "app", relativePath))) {
      try {
        return await defaultResolve(pathToFileURL(candidate).href, context, defaultResolve);
      } catch {
        // Try the next candidate.
      }
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}
