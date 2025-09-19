import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const authResult = auth();
  console.log("[debug] Auth result:", authResult);
  
  return NextResponse.json({
    ok: true,
    auth: authResult,
    userId: !!authResult.userId,
    orgId: authResult.orgId || null,
    env: {
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSerp: !!process.env.SERPAPI_KEY,
    },
  });
}