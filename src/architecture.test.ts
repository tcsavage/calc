import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SRC = resolve(__dirname);
const IMPORT_PATTERN =
  /(?:import|export)\s[^"']*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

interface ImportEdge {
  file: string;
  specifier: string;
  /** Path relative to src for relative imports, otherwise undefined. */
  target?: string;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

function importsOf(file: string): ImportEdge[] {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(IMPORT_PATTERN)].map((match) => {
    const specifier = (match[1] ?? match[2]) as string;
    const rel = relative(SRC, file);
    if (!specifier.startsWith(".")) return { file: rel, specifier };
    return { file: rel, specifier, target: relative(SRC, resolve(dirname(file), specifier)) };
  });
}

const edges = sourceFiles(SRC)
  .filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
  .flatMap(importsOf);

function violations(predicate: (edge: ImportEdge) => boolean): string[] {
  return edges.filter(predicate).map((edge) => `${edge.file} imports ${edge.specifier}`);
}

/** Code shared by the slide rule instruments; any instrument may import it. */
const KIT = "slide-rule-kit";
const instrumentOf = (path: string) => /^instruments\/([^/]+)\//.exec(path)?.[1];

test("core imports only core and zod", () => {
  expect(
    violations(
      (edge) =>
        edge.file.startsWith("core/") &&
        (edge.target === undefined ? edge.specifier !== "zod" : !edge.target.startsWith("core/")),
    ),
  ).toEqual([]);
});

test("coordination does not import adapters or UI", () => {
  expect(
    violations(
      (edge) =>
        /^instruments\/[^/]+\/state\//.test(edge.file) &&
        edge.target !== undefined &&
        /^instruments\/[^/]+\/(adapters|ui)\//.test(edge.target),
    ),
  ).toEqual([]);
});

test("instruments do not import the app shell", () => {
  expect(
    violations(
      (edge) => edge.file.startsWith("instruments/") && edge.target?.startsWith("app/") === true,
    ),
  ).toEqual([]);
});

test("instruments do not import each other", () => {
  expect(
    violations((edge) => {
      const from = instrumentOf(edge.file);
      const to = edge.target === undefined ? undefined : instrumentOf(edge.target);
      return from !== undefined && to !== undefined && to !== KIT && from !== to;
    }),
  ).toEqual([]);
});

test("the slide rule kit imports no instrument", () => {
  expect(
    violations((edge) => {
      const to = edge.target === undefined ? undefined : instrumentOf(edge.target);
      return instrumentOf(edge.file) === KIT && to !== undefined && to !== KIT;
    }),
  ).toEqual([]);
});
