import { z } from 'zod';
import { insertBookmarkSchema, bookmarks } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  bookmarks: {
    list: {
      method: 'GET' as const,
      path: '/api/bookmarks' as const,
      responses: {
        200: z.array(z.custom<typeof bookmarks.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bookmarks' as const,
      input: insertBookmarkSchema,
      responses: {
        201: z.custom<typeof bookmarks.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/bookmarks/:id' as const,
      input: insertBookmarkSchema.partial(),
      responses: {
        200: z.custom<typeof bookmarks.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/bookmarks/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
