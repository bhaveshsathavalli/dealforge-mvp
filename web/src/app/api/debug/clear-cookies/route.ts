// web/src/app/api/debug/clear-cookies/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear all Supabase cookies
    const supabaseCookies = [
      'sb-rhduzkuvytwkjtwisozy-auth-token',
      'sb-rhduzkuvytwkjtwisozy-auth-token-code-verifier',
      'sb-rhduzkuvytwkjtwisozy-auth-token.0',
      'sb-rhduzkuvytwkjtwisozy-auth-token.1',
      'sb-rhduzkuvytwkjtwisozy-auth-token.2',
      'sb-rhduzkuvytwkjtwisozy-auth-token.3',
      'sb-rhduzkuvytwkjtwisozy-auth-token.4',
      'sb-rhduzkuvytwkjtwisozy-auth-token.5',
      'sb-rhduzkuvytwkjtwisozy-auth-token.6',
      'sb-rhduzkuvytwkjtwisozy-auth-token.7',
      'sb-rhduzkuvytwkjtwisozy-auth-token.8',
      'sb-rhduzkuvytwkjtwisozy-auth-token.9',
    ];

    const response = NextResponse.json({ 
      success: true, 
      message: "Cookies cleared",
      clearedCookies: supabaseCookies 
    });

    // Clear cookies by setting them to expire
    supabaseCookies.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    });

    return response;
  } catch (error) {
    console.error("Clear cookies error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

