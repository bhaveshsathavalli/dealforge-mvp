import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = NextResponse.json({ message: "Setting server-readable cookie" });
  
  // Set a cookie that should be readable by the server
  response.cookies.set("server-test", "server-value", {
    path: "/",
    domain: "localhost",
    secure: false,  // false for localhost
    httpOnly: true, // true so server can read it
    sameSite: "lax"
  });
  
  return response;
}






