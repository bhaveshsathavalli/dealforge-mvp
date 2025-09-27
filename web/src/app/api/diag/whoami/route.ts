import { auth } from "@clerk/nextjs/server";
import { getActiveOrg } from "@/server/org";

export async function GET() {
  try {
    const { userId, orgId: clerkOrgId, sessionId } = await auth();
    
    // If not authenticated, return early with auth info
    if (!userId) {
      return Response.json({ 
        clerk: { 
          userId: null, 
          clerkOrgId: null, 
          sessionId: null 
        }, 
        resolved: null,
        error: "Not authenticated"
      }, { status: 200 });
    }
    
    // If authenticated, get the resolved org
    const resolved = await getActiveOrg(); // includes internal orgId
    
    return Response.json({ 
      clerk: { 
        userId, 
        clerkOrgId, 
        sessionId 
      }, 
      resolved 
    }, { status: 200 });
  } catch (e: any) {
    return Response.json({ 
      error: String(e?.message ?? e),
      stack: e?.stack 
    }, { status: 500 });
  }
}
