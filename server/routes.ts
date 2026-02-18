import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookmarkSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get("/api/bookmarks", async (_req, res) => {
    const bookmarks = await storage.getBookmarks();
    res.json(bookmarks);
  });

  app.post("/api/bookmarks", async (req, res) => {
    try {
      const data = insertBookmarkSchema.parse(req.body);
      const bookmark = await storage.createBookmark(data);
      res.status(201).json(bookmark);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.put("/api/bookmarks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    try {
      const data = insertBookmarkSchema.partial().parse(req.body);
      const updated = await storage.updateBookmark(id, data);
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
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    await storage.deleteBookmark(id);
    res.status(204).send();
  });

  // Seed initial data if empty
  const existing = await storage.getBookmarks();
  if (existing.length === 0) {
    await storage.createBookmark({
      title: "Three.js Documentation",
      url: "https://threejs.org/docs/",
      category: "Development"
    });
    await storage.createBookmark({
      title: "React Three Fiber",
      url: "https://docs.pmnd.rs/react-three-fiber/getting-started/introduction",
      category: "Development"
    });
    await storage.createBookmark({
      title: "Replit",
      url: "https://replit.com",
      category: "Tools"
    });
    await storage.createBookmark({
      title: "Awwwards",
      url: "https://www.awwwards.com",
      category: "Design"
    });
    await storage.createBookmark({
      title: "Dribbble",
      url: "https://dribbble.com",
      category: "Design"
    });
  }

  return httpServer;
}
