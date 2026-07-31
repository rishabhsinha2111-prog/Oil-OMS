import { cookies } from "next/headers";

export type SessionUser = {
  id: number;
  name: string;
  role: "admin" | "purchase" | "sales";
};

const COOKIE_NAME = "sauda_session";

export function setSessionCookie(user: SessionUser) {
  cookies().set(COOKIE_NAME, JSON.stringify(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function getSessionUser(): SessionUser | null {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}
