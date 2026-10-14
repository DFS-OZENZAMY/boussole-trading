import { fail } from "../../../lib/auth.js";
export async function onRequest({ data, next }) {
  if (!data.user || data.user.role !== "admin") return fail("Réservé aux administrateurs.", 403);
  return next();
}
