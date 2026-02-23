import {
  bookmarks,
  userSettings,
  users,
  type Bookmark,
  type InsertBookmark,
  type SignupInput,
  type UpdateBookmark,
  type User,
  type UserSettings,
  type UpsertSettings,
} from "@shared/schema";
import { db } from "./db";
import { and, eq } from "drizzle-orm";

export interface IStorage {
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(input: SignupInput & { passwordHash: string }): Promise<User>;
  getBookmarks(userId: string): Promise<Bookmark[]>;
  getBookmark(id: number, userId: string): Promise<Bookmark | undefined>;
  createBookmark(bookmark: InsertBookmark, userId: string): Promise<Bookmark>;
  updateBookmark(id: number, bookmark: UpdateBookmark, userId: string): Promise<Bookmark | undefined>;
  updateBookmarkLayouts(
    userId: string,
    layouts: Array<Pick<Bookmark, "id" | "x" | "y" | "z" | "scale" | "pinned">>,
  ): Promise<void>;
  deleteBookmark(id: number, userId: string): Promise<boolean>;
  getSettings(userId: string): Promise<UserSettings | undefined>;
  upsertSettings(userId: string, settings: UpsertSettings): Promise<UserSettings>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(input: SignupInput & { passwordHash: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
      })
      .returning();
    return user;
  }

  async getBookmarks(userId: string): Promise<Bookmark[]> {
    return await db.select().from(bookmarks).where(eq(bookmarks.userId, userId));
  }

  async getBookmark(id: number, userId: string): Promise<Bookmark | undefined> {
    const [bookmark] = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)));
    return bookmark;
  }

  async createBookmark(insertBookmark: InsertBookmark, userId: string): Promise<Bookmark> {
    const [bookmark] = await db.insert(bookmarks).values({ ...insertBookmark, userId }).returning();
    return bookmark;
  }

  async updateBookmark(
    id: number,
    updateBookmark: UpdateBookmark,
    userId: string,
  ): Promise<Bookmark | undefined> {
    const [bookmark] = await db
      .update(bookmarks)
      .set(updateBookmark)
      .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)))
      .returning();
    return bookmark;
  }

  async updateBookmarkLayouts(
    userId: string,
    layouts: Array<Pick<Bookmark, "id" | "x" | "y" | "z" | "scale" | "pinned">>,
  ): Promise<void> {
    for (const layout of layouts) {
      await db
        .update(bookmarks)
        .set({
          x: layout.x,
          y: layout.y,
          z: layout.z,
          scale: layout.scale,
          pinned: layout.pinned,
        })
        .where(and(eq(bookmarks.id, layout.id), eq(bookmarks.userId, userId)));
    }
  }

  async deleteBookmark(id: number, userId: string): Promise<boolean> {
    const deleted = await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)))
      .returning({ id: bookmarks.id });
    return deleted.length > 0;
  }

  async getSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings;
  }

  async upsertSettings(userId: string, settings: UpsertSettings): Promise<UserSettings> {
    const existing = await this.getSettings(userId);

    if (existing) {
      const [updated] = await db
        .update(userSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userSettings.userId, userId))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(userSettings)
      .values({ userId, ...settings })
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
