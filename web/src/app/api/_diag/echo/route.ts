import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId, orgId } = auth();
  return NextResponse.json({
    ok: true,
    userId: !!userId,
    orgId: orgId || null,
    env: {
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSerp: !!process.env.SERPAPI_KEY,
    },
  });
}
