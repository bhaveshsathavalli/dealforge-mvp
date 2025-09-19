import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const authResult = await auth();
  console.log("[diag/echo] Auth result:", authResult);
  
  return NextResponse.json({
    ok: true,
    userId: !!authResult.userId,
    orgId: authResult.orgId || null,
    debug: {
      fullAuth: authResult,
      hasUserId: !!authResult.userId,
      hasOrgId: !!authResult.orgId,
    },
    env: {
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSerp: !!process.env.SERPAPI_KEY,
    },
  });
}
