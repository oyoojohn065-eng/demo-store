import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";

// Returns the token value the cookie should hold when authenticated.
// Derived from the admin password so it changes if the password changes.
export function expectedToken() {
  const pw = process.env.ADMIN_PASSWORD || "";
  // Simple, non-reversible-ish token. Not a substitute for real auth,
  // but fine for a local/single-admin setup. Replace before public launch.
  let hash = 0;
  const salted = `demo-store::${pw}`;
  for (let i = 0; i < salted.length; i++) {
    hash = (hash * 31 + salted.charCodeAt(i)) | 0;
  }
  return `t_${hash}`;
}

export async function isAuthenticated() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  return Boolean(token) && token === expectedToken();
}
