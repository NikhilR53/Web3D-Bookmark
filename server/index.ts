import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const isProduction = process.env.NODE_ENV === "production";

function logError(context: string, error: unknown) {
  if (error instanceof Error) {
    console.error(`[${context}] ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    return;
  }

  console.error(`[${context}]`, error);
}

process.on("uncaughtException", (error) => {
  logError("uncaughtException", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logError("unhandledRejection", reason);
  process.exit(1);
});

function validateStartupEnv() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required and must be non-empty.");
  }

  if (isProduction && !process.env.SESSION_SECRET?.trim()) {
    throw new Error("SESSION_SECRET must be set in production.");
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const app = express();
const httpServer = createServer(app);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-session-secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  validateStartupEnv();

  try {
    const { assertDatabaseConnection } = await import("./db");
    await assertDatabaseConnection();
  } catch (error) {
    logError("startup", error);
    process.exit(1);
  }

  try {
    await registerRoutes(httpServer, app);
  } catch (error) {
    logError("startup", error);
    process.exit(1);
  }

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const baseMessage = err?.message || "Internal Server Error";
    const message = status >= 500 ? "Internal Server Error" : baseMessage;

    console.error("Internal Server Error:", err?.stack || err);

    if (res.headersSent) {
      return next(err);
    }

    const includeErrorDetails = !isProduction;
    return res.status(status).json(
      includeErrorDetails
        ? { message, error: baseMessage }
        : { message },
    );
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (isProduction) {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = process.env.PORT || 5000;

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
})().catch((error) => {
  logError("startup", error);
  process.exit(1);
});


