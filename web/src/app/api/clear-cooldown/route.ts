import { NextResponse } from "next/server";
import { finishRun } from "@/lib/facts/run-guard";
import { getOrgUuidFromClerk } from "@/lib/org/ids";

export async function POST() {
  try {
    const { orgUuid } = await getOrgUuidFromClerk();
    
    // Clear the cooldown for this org
    finishRun(orgUuid);
    
    return NextResponse.json({ 
      success: true, 
      message: `Cooldown cleared for org: ${orgUuid}` 
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
