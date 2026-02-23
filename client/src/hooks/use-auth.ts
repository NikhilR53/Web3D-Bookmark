import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type LoginInput, type SignupInput } from "@shared/schema";

const explicitApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const attempts = [path];

  if (!path.startsWith("http")) {
    if (explicitApiBase) {
      attempts.push(`${explicitApiBase}${path}`);
    } else {
      attempts.push(`http://127.0.0.1:5000${path}`);
    }
  }

  let lastError: unknown;
  for (const url of attempts) {
    try {
      return await fetch(url, { ...init, credentials: "include" });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Network request failed");
}

async function getErrorMessage(res: Response, fallback: string) {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const body = await res.json();
      if (body?.message && typeof body.message === "string") return body.message;
    } catch {
      // Ignore JSON parse failures and use fallback below.
    }
  } else {
    try {
      await res.text();
    } catch {
      // Ignore text parse failures and use fallback below.
    }
  }

  return fallback;
}

export function useAuthSession() {
  return useQuery({
    queryKey: [api.profile.me.path],
    queryFn: async () => {
      const res = await authFetch(api.profile.me.path);
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch profile");
      return api.profile.me.responses[200].parse(await res.json());
    },
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SignupInput) => {
      const payload = api.auth.signup.input.parse(input);
      const res = await authFetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const fallback = res.status === 409 ? "Email already registered" : "Signup failed";
        const message = await getErrorMessage(res, fallback);
        throw new Error(message);
      }

      return api.auth.signup.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.profile.me.path] });
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const payload = api.auth.login.input.parse(input);
      const res = await authFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const fallback = res.status === 401 ? "Invalid email or password" : "Login failed";
        const message = await getErrorMessage(res, fallback);
        throw new Error(message);
      }

      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.profile.me.path] });
    },
  });
}
