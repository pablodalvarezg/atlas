import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * Reading build output, without reading anything else.
 *
 * `.next/server/app/token/` is not a safe place to glob: ISR writes there at
 * runtime too, so a single request to /token/anything leaves a soft-404 shell
 * that looks exactly like a prerendered page. That bit us — eleven requests
 * turned a green suite into ten failures, and the reverse is worse: a budget
 * measured against a 404 shell passes while measuring nothing.
 *
 * `prerender-manifest.json` lists what `next build` produced and nothing else,
 * so it is the only list these tests trust.
 */
export const BUILD_DIR = join(process.cwd(), ".next");

export type PrerenderedPage = {
  /** The route, e.g. "/token/bitcoin". */
  readonly route: string;
  readonly html: string;
};

function readManifest(): { routes?: Record<string, unknown> } {
  const path = join(BUILD_DIR, "prerender-manifest.json");

  if (!existsSync(path)) {
    throw new Error(
      `No build at ${path}. Run \`npm run build\` before this test — it asserts on build output, not on a render.`,
    );
  }

  return JSON.parse(readFileSync(path, "utf8")) as {
    routes?: Record<string, unknown>;
  };
}

/** Every page the build prerendered under a prefix, with its HTML. */
export function prerenderedPages(prefix: string): PrerenderedPage[] {
  const routes = Object.keys(readManifest().routes ?? {}).filter((route) =>
    route.startsWith(prefix),
  );

  return routes.map((route) => {
    const html = join(BUILD_DIR, "server", "app", `${route}.html`);

    if (!existsSync(html)) {
      throw new Error(
        `${route} is in the prerender manifest but ${html} is missing.`,
      );
    }

    return { route, html: readFileSync(html, "utf8") };
  });
}
