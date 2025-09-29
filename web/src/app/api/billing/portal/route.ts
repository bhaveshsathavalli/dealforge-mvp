import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { getActiveOrg } from "@/server/org";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function POST(req: Request) {
  try {
    const { orgId } = await getActiveOrg();
    const supabase = supabaseAdmin;

    const { data: org, error } = await supabase
      .from("orgs")
      .select("id, stripe_customer_id")
      .eq("id", orgId)
      .single();
    if (error || !org?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer" }, { status: 400 });
    }

    const returnUrl = new URL("/settings?tab=general", req.url).toString();
    const portal = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portal.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "portal error" }, { status: 500 });
  }
}
