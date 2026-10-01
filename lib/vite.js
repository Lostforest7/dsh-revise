// src/vite/index.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import MagicString from "magic-string";
function revise() {
  let root = "";
  return {
    name: "dsh-revise",
    apply: "serve",
    enforce: "pre",
    config(config) {
      return config.server?.watch === null ? {} : { server: { watch: { ignored: ["**/.dsh-revise/**"] } } };
    },
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        let pathname;
        try {
          pathname = decodeURIComponent((request.url ?? "").split("?")[0]);
        } catch {
          response.statusCode = 400;
          response.end();
          return;
        }
        if (!/\/\.dsh-revise(?:\/|$)/i.test(pathname)) {
          next();
          return;
        }
        response.statusCode = 403;
        response.setHeader("cache-control", "no-store");
        response.end("DSH Revise review records are private local files.");
      });
    },
    transformIndexHtml() {
      return [{ tag: "script", attrs: { type: "module" }, children: readFileSync(new URL("./probe.js", import.meta.url), "utf8"), injectTo: "body" }];
    },
    transform(code, id) {
      const file = id.split("?")[0];
      if (!/\.[jt]sx$/.test(file) || file.includes("/node_modules/") || file.includes("\\node_modules\\")) return null;
      const relative = path.relative(root, file).split(path.sep).join("/");
      if (relative.startsWith("../") || path.isAbsolute(relative)) return null;
      const ast = parse(code, { sourceType: "module", plugins: ["jsx", ...file.endsWith(".tsx") ? ["typescript"] : []] });
      const output = new MagicString(code);
      function walk(node) {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        const value = node;
        if (value.type === "JSXOpeningElement" && value.name?.type === "JSXIdentifier" && /^[a-z]/.test(value.name.name ?? "") && value.name.end && value.loc && !value.attributes?.some((attribute) => attribute.name?.name === "data-revise-file")) {
          output.appendLeft(value.name.end, ` data-revise-file=${JSON.stringify(relative)} data-revise-line="${value.loc.start.line}" data-revise-column="${value.loc.start.column + 1}"`);
        }
        for (const [key, child] of Object.entries(node)) if (!["loc", "start", "end", "comments", "tokens"].includes(key)) walk(child);
      }
      walk(ast);
      return { code: output.toString(), map: output.generateMap({ hires: true, source: file, includeContent: true }) };
    }
  };
}
var index_default = revise;
export {
  index_default as default,
  revise
};
