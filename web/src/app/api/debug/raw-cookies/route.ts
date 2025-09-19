import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    console.log("=== RAW COOKIE DEBUG ===");
    console.log("Raw cookies count:", allCookies.length);
    console.log("Raw cookies:", allCookies);
    
    return NextResponse.json({
      cookieCount: allCookies.length,
      cookies: allCookies,
      message: "Raw cookie inspection"
    });
  } catch (error) {
    console.error("Raw cookie debug error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

