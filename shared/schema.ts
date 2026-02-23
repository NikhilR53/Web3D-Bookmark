import { pgTable, text, serial, timestamp, varchar, real, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 64 }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  x: real("x").default(0),
  y: real("y").default(0),
  z: real("z").default(0),
  scale: real("scale").default(1),
  pinned: boolean("pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull().unique(),
  glowIntensity: real("glow_intensity").default(1.1),
  autoRotateSpeed: real("auto_rotate_speed").default(0.35),
  zoomSensitivity: real("zoom_sensitivity").default(1),
  particleDensity: integer("particle_density").default(120),
  performanceMode: boolean("performance_mode").default(false),
  reducedMotion: boolean("reduced_motion").default(false),
  highContrast: boolean("high_contrast").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({ 
  id: true, 
  userId: true,
  createdAt: true 
});

export const updateBookmarkLayoutSchema = z.object({
  id: z.number().int().positive(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  scale: z.number().min(0.2).max(3).default(1),
  pinned: z.boolean().optional(),
});

export const upsertSettingsSchema = createInsertSchema(userSettings)
  .omit({ id: true, userId: true, updatedAt: true })
  .partial();

export const signupSchema = createInsertSchema(users)
  .pick({ name: true, email: true })
  .extend({
    email: z.string().email(),
    password: z.string().min(8).max(128),
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type UpdateBookmark = Partial<InsertBookmark>;
export type UserSettings = typeof userSettings.$inferSelect;
export type UpsertSettings = z.infer<typeof upsertSettingsSchema>;
export type User = typeof users.$inferSelect;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
