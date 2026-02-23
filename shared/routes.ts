import { z } from 'zod';
import {
  insertBookmarkSchema,
  loginSchema,
  bookmarks,
  signupSchema,
  updateBookmarkLayoutSchema,
  upsertSettingsSchema,
  userSettings,
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    signup: {
      method: 'POST' as const,
      path: '/api/auth/signup' as const,
      input: signupSchema,
      responses: {
        201: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string().email(),
          role: z.string(),
        }),
        400: errorSchemas.validation,
        409: z.object({ message: z.string() }),
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: loginSchema,
      responses: {
        200: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string().email(),
          role: z.string(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  profile: {
    me: {
      method: 'GET' as const,
      path: '/api/profile' as const,
      responses: {
        200: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string().email(),
          role: z.string(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout' as const,
      responses: {
        204: z.void(),
      },
    },
  },
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/settings' as const,
      responses: {
        200: z.custom<typeof userSettings.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/settings' as const,
      input: upsertSettingsSchema,
      responses: {
        200: z.custom<typeof userSettings.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  bookmarks: {
    list: {
      method: 'GET' as const,
      path: '/api/bookmarks' as const,
      responses: {
        200: z.array(z.custom<typeof bookmarks.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bookmarks' as const,
      input: insertBookmarkSchema,
      responses: {
        201: z.custom<typeof bookmarks.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
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
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/bookmarks/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    layout: {
      method: 'PUT' as const,
      path: '/api/bookmarks/layout' as const,
      input: z.array(updateBookmarkLayoutSchema),
      responses: {
        204: z.void(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
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
