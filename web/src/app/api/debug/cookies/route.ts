import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    console.log("=== COOKIE DEBUG ===");
    console.log("All cookies:", allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 50) + "..." })));
    
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log("Session check:", { hasSession: !!session, userId: session?.user?.id, error: error?.message });
    
    return NextResponse.json({
      cookies: allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 50) + "..." })),
      session: {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        error: error?.message
      }
    });
  } catch (error) {
    console.error("Cookie debug error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

