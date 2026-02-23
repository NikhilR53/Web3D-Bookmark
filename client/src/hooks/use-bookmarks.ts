import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Bookmark, type InsertBookmark, type UpsertSettings } from "@shared/schema";

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    if (body?.message) return body.message;
  } catch {
    // Ignore JSON parsing errors and fall back to a generic message.
  }
  return fallback;
}

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
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, "Failed to delete bookmark"));
      }

      return id;
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: [api.bookmarks.list.path] });
      const previousBookmarks = queryClient.getQueryData<Bookmark[]>([api.bookmarks.list.path]);

      queryClient.setQueryData<Bookmark[]>([api.bookmarks.list.path], (current = []) =>
        current.filter((bookmark) => bookmark.id !== id),
      );

      return { previousBookmarks };
    },
    onError: (_error, _id, context) => {
      if (context?.previousBookmarks) {
        queryClient.setQueryData([api.bookmarks.list.path], context.previousBookmarks);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [api.bookmarks.list.path] }),
  });
}

export function useSaveBookmarkLayouts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      layouts: Array<Pick<Bookmark, "id" | "x" | "y" | "z" | "scale" | "pinned">>,
    ) => {
      const validated = api.bookmarks.layout.input.parse(layouts);
      const res = await fetch(api.bookmarks.layout.path, {
        method: api.bookmarks.layout.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save bookmark layout");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.bookmarks.list.path] }),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: [api.profile.me.path],
    queryFn: async () => {
      const res = await fetch(api.profile.me.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return api.profile.me.responses[200].parse(await res.json());
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.profile.logout.path, {
        method: api.profile.logout.method,
        credentials: "include",
      });
      if (res.status !== 204) throw new Error("Failed to logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: [api.settings.get.path],
    queryFn: async () => {
      const res = await fetch(api.settings.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return api.settings.get.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: UpsertSettings) => {
      const validated = api.settings.update.input.parse(settings);
      const res = await fetch(api.settings.update.path, {
        method: api.settings.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, "Failed to update settings"));
      }
      return api.settings.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.settings.get.path] }),
  });
}
