import { NextResponse } from "next/server";
import { getOrgUuidFromClerk } from "@/lib/org/ids";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { orgId: clerkOrgId, userId } = await auth();
    
    if (!clerkOrgId) {
      return NextResponse.json({
        success: false,
        error: "No Clerk orgId in session"
      }, { status: 400 });
    }
    
    const { orgUuid } = await getOrgUuidFromClerk();
    
    return NextResponse.json({
      success: true,
      clerkOrgId,
      orgUuid,
      userId,
      message: "Successfully mapped Clerk org ID to database UUID"
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
