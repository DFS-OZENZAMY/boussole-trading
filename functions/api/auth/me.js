import { json, publicUser } from "../../../lib/auth.js";
export async function onRequestGet({ data }) { return json({ user: publicUser(data.user) }); }
