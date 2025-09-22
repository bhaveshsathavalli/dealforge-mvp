import { NextRequest, NextResponse } from "next/server";
import { testFactsTables } from "@/lib/facts/test-tables";

export async function GET(request: NextRequest) {
  try {
    const result = await testFactsTables();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: `API error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}