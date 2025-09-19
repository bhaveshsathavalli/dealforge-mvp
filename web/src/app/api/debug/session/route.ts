// web/src/app/api/debug/session/route.ts
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    return NextResponse.json({
      hasSession: !!session,
      sessionError: sessionError?.message || null,
      userId: session?.user?.id || null,
      email: session?.user?.email || null,
    });
  } catch (error) {
    console.error("Debug session error:", error);
    return NextResponse.json(
      { 
        hasSession: false, 
        error: "Internal server error",
        sessionError: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 },
    );
  }
}