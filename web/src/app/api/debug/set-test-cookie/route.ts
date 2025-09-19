import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = NextResponse.json({ message: "Test cookie set" });
  
  // Set a simple test cookie
  response.cookies.set("test-cookie", "test-value", {
    path: "/",
    domain: "localhost",
    secure: false,
    httpOnly: false,
    sameSite: "lax"
  });
  
  return response;
}

