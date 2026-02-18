import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

// Helper type for inputs since we can't infer directly from route definition sometimes
import { type InsertBookmark } from "@shared/schema";

export function useBookmarks() {
  return useQuery({
    queryKey: [api.bookmarks.list.path],
    queryFn: async () => {
      const res = await fetch(api.bookmarks.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bookmarks");
      return api.bookmarks.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertBookmark) => {
      const validated = api.bookmarks.create.input.parse(data);
      const res = await fetch(api.bookmarks.create.path, {
        method: api.bookmarks.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.bookmarks.create.responses[400].parse(await res.json());
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create bookmark");
      }
      return api.bookmarks.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.bookmarks.list.path] }),
  });
}

export function useUpdateBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertBookmark>) => {
      const validated = api.bookmarks.update.input.parse(updates);
      const url = buildUrl(api.bookmarks.update.path, { id });
      
      const res = await fetch(url, {
        method: api.bookmarks.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Bookmark not found");
        if (res.status === 400) throw new Error("Validation failed");
        throw new Error("Failed to update bookmark");
      }
      
      return api.bookmarks.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.bookmarks.list.path] }),
  });
}

export function useDeleteBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.bookmarks.delete.path, { id });
      const res = await fetch(url, { 
        method: api.bookmarks.delete.method, 
        credentials: "include" 
      });
      
      if (res.status === 404) throw new Error("Bookmark not found");
      if (!res.ok) throw new Error("Failed to delete bookmark");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.bookmarks.list.path] }),
  });
}
