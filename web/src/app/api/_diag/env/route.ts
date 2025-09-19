import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export function GET() {
  const req = ["SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","SERPAPI_KEY","CLERK_SECRET_KEY","NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"];
  const ok = Object.fromEntries(req.map(k => [k, !!process.env[k]]));
  return NextResponse.json({ ok, port: process.env.PORT ?? "3000" });
}
