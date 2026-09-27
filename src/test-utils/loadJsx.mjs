/**
 * Test-only helper: load a JSX component from src/components (or any .js file
 * containing JSX) under plain `node --test`, so the tests can render the REAL
 * component to a DOM instead of asserting on its source text.
 *
 *   - transpiles JSX with the TypeScript compiler already in devDependencies;
 *   - resolves the app's "@/..." import alias;
 *   - recursively transpiles other components it imports;
 *   - lets a test replace a heavy/browser-only dependency with a stub
 *     (e.g. the TipTap RichEditor, the portal-based Modal, the API client).
 *
 * Output is written under node_modules/.cache (git-ignored), never into src/.
 * Plain (non-JSX) modules under src/lib are imported as-is.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(SRC, "..");
const CACHE = join(ROOT, "node_modules", ".cache", "hm-jsx-tests");

/** @param {string} srcRelPath e.g. "components/richeditor/PreviewModal.js"
 *  @param {{stubs?: Record<string,string>}} opts  stubs: alias-path (e.g.
 *  "components/Modal") -> ESM source text of the replacement module. */
export async function loadJsx(srcRelPath, { stubs = {} } = {}) {
  const tag = createHash("sha1").update(JSON.stringify(stubs)).digest("hex").slice(0, 10);
  const outDir = join(CACHE, tag);
  const done = new Map();

  function outPathFor(rel) {
    return join(outDir, rel.replace(/\.js$/, "") + ".mjs");
  }
  function resolveAlias(spec) {
    const rel = spec.replace(/^@\//, "");
    if (stubs[rel] !== undefined) {
      const p = join(outDir, "__stubs__", rel + ".mjs");
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, stubs[rel]);
      return pathToFileURL(p).href;
    }
    const file = existsSync(join(SRC, rel + ".js")) ? rel + ".js" : rel;
    if (file.startsWith("components/")) {
      return pathToFileURL(transpile(file)).href; // may contain JSX -> transpile
    }
    return pathToFileURL(join(SRC, file)).href; // plain module (src/lib/...)
  }
  function transpile(rel) {
    const out = outPathFor(rel);
    if (done.has(rel)) return done.get(rel);
    done.set(rel, out);
    const source = readFileSync(join(SRC, rel), "utf8");
    const result = ts.transpileModule(source, {
      fileName: rel,
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
        allowJs: true, esModuleInterop: true,
      },
    });
    // rewrite "@/..." specifiers and relative component imports to absolute file URLs
    let code = result.outputText.replace(/(from\s+|import\s*\(\s*)(["'])(@\/[^"']+)\2/g, (_m, pre, q, spec) => `${pre}${q}${resolveAlias(spec)}${q}`);
    code = code.replace(/(from\s+)(["'])(\.{1,2}\/[^"']+)\2/g, (_m, pre, q, spec) => {
      const target = join(dirname(join(SRC, rel)), spec);
      const targetRel = relative(SRC, target).replace(/\\/g, "/");
      const withExt = existsSync(target + ".js") ? targetRel + ".js" : targetRel;
      if (withExt.startsWith("components/")) return `${pre}${q}${pathToFileURL(transpile(withExt.replace(/\.js$/, "") + ".js")).href}${q}`;
      return `${pre}${q}${pathToFileURL(join(SRC, withExt)).href}${q}`;
    });
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, code);
    return out;
  }
  const entry = transpile(srcRelPath);
  return import(pathToFileURL(entry).href + `?v=${Date.now()}`);
}
