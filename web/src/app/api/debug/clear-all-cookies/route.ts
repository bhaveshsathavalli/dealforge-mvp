import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ message: "Clearing all cookies" });
  const cookieStore = cookies();

  // Get all cookie names
  const allCookies = cookieStore.getAll();
  console.log("All cookies found:", allCookies.map(c => c.name));

  // Clear all cookies
  allCookies.forEach((cookie) => {
    response.cookies.set(cookie.name, "", { 
      expires: new Date(0), 
      path: "/",
      domain: "localhost",
      secure: false,
      httpOnly: true,
      sameSite: "lax"
    });
    console.log(`Cleared cookie: ${cookie.name}`);
  });

  // Also clear common Supabase cookies explicitly
  const supabaseCookieNames = [
    "sb-access-token",
    "sb-refresh-token",
    "sb-rhduzkuvytwkjtwisozy-auth-token",
    "sb-rhduzkuvytwkjtwisozy-auth-token.0",
    "sb-rhduzkuvytwkjtwisozy-auth-token-code-verifier",
  ];

  supabaseCookieNames.forEach((name) => {
    response.cookies.set(name, "", { 
      expires: new Date(0), 
      path: "/",
      domain: "localhost",
      secure: false,
      httpOnly: true,
      sameSite: "lax"
    });
  });

  return response;
}

