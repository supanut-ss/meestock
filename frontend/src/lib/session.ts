import "server-only";

import { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: "owner" | "staff" | string;
  merchantId: string;
};

export const SESSION_COOKIE = "meestock_session";

function decodeSession(token: string): SessionUser | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload as SessionUser;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    return token ? decodeSession(token) : null;
  } catch {
    return null;
  }
}

export async function requireAuthenticatedUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");
  return user;
}

export async function requireAdminUser(): Promise<SessionUser> {
  const user = await requireAuthenticatedUser();
  if (user.role !== "owner" && user.role !== "admin") {
    throw new Error("Admin permission required");
  }
  return user;
}
