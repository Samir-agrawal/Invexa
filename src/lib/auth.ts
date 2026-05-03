export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "manager" | "viewer";
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

const AUTH_STORAGE_KEY = "auth";

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;

    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user?.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function setAuthSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  window.localStorage.setItem("accessToken", session.accessToken);
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem("accessToken");
  window.localStorage.removeItem("token");
  window.localStorage.removeItem("authToken");
  window.localStorage.removeItem("jwtToken");
}

export function getAccessToken() {
  return getAuthSession()?.accessToken ?? null;
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}
