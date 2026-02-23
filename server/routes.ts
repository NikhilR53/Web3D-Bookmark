import type { Express } from "express";
import type session from "express-session";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertBookmarkSchema,
  loginSchema,
  signupSchema,
  upsertSettingsSchema,
  updateBookmarkLayoutSchema,
} from "@shared/schema";
import { z } from "zod";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

declare module "express-session" {
  interface SessionData {
    authUserId?: number;
  }
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) return false;
  const incomingHash = scryptSync(password, salt, 64);
  const originalHashBuffer = Buffer.from(originalHash, "hex");
  if (incomingHash.length !== originalHashBuffer.length) return false;
  return timingSafeEqual(incomingHash, originalHashBuffer);
}

async function resolveAuthenticatedUser(
  sess: session.Session & Partial<session.SessionData>,
) {
  if (!sess.authUserId) return null;
  return (await storage.getUserById(sess.authUserId)) ?? null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get("/api/profile", async (req, res) => {
    const user = await resolveAuthenticatedUser(req.session);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.json({
      id: String(user.id),
      email: user.email,
      name: user.name,
      role: "explorer",
    });
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = signupSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const user = await storage.createUser({
        ...data,
        passwordHash: hashPassword(data.password),
      });

      req.session.authUserId = user.id;

      return res.status(201).json({
        id: String(user.id),
        email: user.email,
        name: user.name,
        role: "explorer",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid signup payload", errors: error.errors });
      }
      if (typeof error === "object" && error && "code" in error && error.code === "42P01") {
        return res.status(500).json({ message: "Database schema is outdated. Run npm run db:push." });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);

      if (!user || !verifyPassword(data.password, user.passwordHash)) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.authUserId = user.id;

      return res.status(200).json({
        id: String(user.id),
        email: user.email,
        name: user.name,
        role: "explorer",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid login payload", errors: error.errors });
      }
      if (typeof error === "object" && error && "code" in error && error.code === "42P01") {
        return res.status(500).json({ message: "Database schema is outdated. Run npm run db:push." });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.status(204).send();
    });
  });

  app.get("/api/settings", async (req, res) => {
    try {
      const user = await resolveAuthenticatedUser(req.session);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = String(user.id);
      const settings = await storage.getSettings(userId);
      res.json(
        settings ?? {
          userId,
          glowIntensity: 1.1,
          autoRotateSpeed: 0.35,
          zoomSensitivity: 1,
          particleDensity: 120,
          performanceMode: false,
          reducedMotion: false,
          highContrast: false,
        },
      );
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "42P01") {
        return res.status(500).json({ message: "Database schema is outdated. Run npm run db:push." });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const user = await resolveAuthenticatedUser(req.session);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = String(user.id);
      const data = upsertSettingsSchema.parse(req.body);
      const settings = await storage.upsertSettings(userId, data);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid settings payload", errors: error.errors });
      }
      if (typeof error === "object" && error && "code" in error && error.code === "42P01") {
        return res.status(500).json({ message: "Database schema is outdated. Run npm run db:push." });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/bookmarks", async (_req, res) => {
    const user = await resolveAuthenticatedUser(_req.session);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const bookmarks = await storage.getBookmarks(String(user.id));
    res.json(bookmarks);
  });

  app.post("/api/bookmarks", async (req, res) => {
    const user = await resolveAuthenticatedUser(req.session);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const data = insertBookmarkSchema.parse(req.body);
      const bookmark = await storage.createBookmark(data, String(user.id));
      res.status(201).json(bookmark);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.put("/api/bookmarks/layout", async (req, res) => {
    const user = await resolveAuthenticatedUser(req.session);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const layouts = z.array(updateBookmarkLayoutSchema).parse(req.body);
      await storage.updateBookmarkLayouts(
        String(user.id),
        layouts.map((layout) => ({
          ...layout,
          pinned: layout.pinned ?? false,
        })),
      );
      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid layout payload", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/bookmarks/:id", async (req, res) => {
    const user = await resolveAuthenticatedUser(req.session);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    try {
      const data = insertBookmarkSchema.partial().parse(req.body);
      const updated = await storage.updateBookmark(id, data, String(user.id));
      if (!updated) {
        return res.status(404).json({ message: "Bookmark not found" });
      }
      res.json(updated);
    } catch (error) {
       if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.delete("/api/bookmarks/:id", async (req, res) => {
    const user = await resolveAuthenticatedUser(req.session);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    try {
      const deleted = await storage.deleteBookmark(id, String(user.id));
      if (!deleted) {
        return res.status(404).json({ message: "Bookmark not found" });
      }
      return res.status(204).send();
    } catch {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API route not found" });
  });

  return httpServer;
}
