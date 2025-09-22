import jwt from "jsonwebtoken";
import { ensureDbOrg } from "./ensureOrg";

// Issue a 5-minute token with org_id claim for PostgREST RLS
export async function issueOrgScopedToken() {
  const { dbOrgId } = await ensureDbOrg();
  const secret = process.env.SUPABASE_JWT_SECRET!;
  return jwt.sign(
    { role: "authenticated", org_id: dbOrgId }, // <- your RLS policies check this
    secret,
    { expiresIn: "5m", issuer: "geo", audience: "postgrest" }
  );
}
