import { NextResponse } from "next/server";
import { saveProduct } from '@/app/settings/actions';

export async function POST(req: Request) {
  try {
    const { name, website } = await req.json();
    
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    await saveProduct({ name: name.trim(), website });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

