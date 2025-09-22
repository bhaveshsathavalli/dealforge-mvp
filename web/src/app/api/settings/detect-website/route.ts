import { NextResponse } from "next/server";
import { detectProductWebsite } from '@/app/settings/actions';

export async function POST(req: Request) {
  try {
    const { url } = await detectProductWebsite();
    return NextResponse.json({ url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

