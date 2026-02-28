import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  // Load Vite config lazily in development so production bundles
  // do not statically include vite.config.ts.
  const { default: viteConfig } = await import("../vite.config");

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  // SPA fallback. Skip API routes so backend handlers still run.
  app.use(async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith("/api")) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(process.cwd(), "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");

      // Cache-bust the entry in dev so latest client code is always served.
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      const page = await vite.transformIndexHtml(url, template);

      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
