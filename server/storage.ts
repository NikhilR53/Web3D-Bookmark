import { bookmarks, type Bookmark, type InsertBookmark, type UpdateBookmark } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getBookmarks(): Promise<Bookmark[]>;
  getBookmark(id: number): Promise<Bookmark | undefined>;
  createBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  updateBookmark(id: number, bookmark: UpdateBookmark): Promise<Bookmark | undefined>;
  deleteBookmark(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getBookmarks(): Promise<Bookmark[]> {
    return await db.select().from(bookmarks);
  }

  async getBookmark(id: number): Promise<Bookmark | undefined> {
    const [bookmark] = await db.select().from(bookmarks).where(eq(bookmarks.id, id));
    return bookmark;
  }

  async createBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const [bookmark] = await db.insert(bookmarks).values(insertBookmark).returning();
    return bookmark;
  }

  async updateBookmark(id: number, updateBookmark: UpdateBookmark): Promise<Bookmark | undefined> {
    const [bookmark] = await db
      .update(bookmarks)
      .set(updateBookmark)
      .where(eq(bookmarks.id, id))
      .returning();
    return bookmark;
  }

  async deleteBookmark(id: number): Promise<void> {
    await db.delete(bookmarks).where(eq(bookmarks.id, id));
  }
}

export const storage = new DatabaseStorage();
