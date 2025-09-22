import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await req.formData();
    const productName = String(formData.get('productName') ?? '').trim();

    // Get organization data using service role
    const { data: org, error: orgError } = await supabaseAdmin
      .from("orgs")
      .select("id")
      .eq('clerk_org_id', orgId)
      .single();
      
    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Update product name
    const { error: updateError } = await supabaseAdmin
      .from('orgs')
      .update({ product_name: productName })
      .eq('id', org.id);
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

