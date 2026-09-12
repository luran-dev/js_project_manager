import { currentUser, initialWorkspaces } from "./data";
import type { CurrentUser, Workspace } from "./types";

export type AppSnapshot = {
  readonly currentUser: CurrentUser;
  readonly workspaces: readonly Workspace[];
};

export type ProjectVibeRepository = {
  readonly loadSnapshot: () => Promise<AppSnapshot>;
  readonly saveSnapshot: (snapshot: AppSnapshot) => Promise<void>;
  readonly login: (email: string, password: string) => Promise<AppSnapshot>;
  readonly register: (name: string, email: string, password: string) => Promise<AppSnapshot>;
  readonly logout: () => Promise<void>;
};

const cloneSnapshot = (snapshot: AppSnapshot): AppSnapshot => structuredClone(snapshot);

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "content-type": "application/json", ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { readonly error?: string } | null;
    throw new Error(body?.error ?? `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
};

type SessionResponse = { readonly authenticated: false } | { readonly authenticated: true; readonly snapshot: AppSnapshot };

export const mockProjectVibeRepository: ProjectVibeRepository = (() => {
  let snapshot: AppSnapshot = { currentUser, workspaces: initialWorkspaces };

  return {
    loadSnapshot: async () => cloneSnapshot(snapshot),
    saveSnapshot: async (nextSnapshot) => {
      snapshot = cloneSnapshot(nextSnapshot);
    },
    login: async () => cloneSnapshot(snapshot),
    register: async () => cloneSnapshot(snapshot),
    logout: async () => undefined,
  };
})();

export const projectVibeRepository: ProjectVibeRepository = {
  loadSnapshot: async () => {
    const session = await requestJson<SessionResponse>("/api/auth/session");
    if (!session.authenticated) {
      throw new Error("Authentication required");
    }
    return session.snapshot;
  },
  saveSnapshot: async (snapshot) => {
    await requestJson<{ readonly ok: true }>("/api/snapshot", { method: "PUT", body: JSON.stringify(snapshot) });
  },
  login: (email, password) => requestJson<AppSnapshot>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name, email, password) => requestJson<AppSnapshot>("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  logout: async () => {
    await requestJson<{ readonly ok: true }>("/api/auth/logout", { method: "POST" });
  },
};
