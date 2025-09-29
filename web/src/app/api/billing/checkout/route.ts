import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { getActiveOrg } from "@/server/org";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function POST(req: Request) {
  try {
    const { orgId } = await getActiveOrg();
    const supabase = supabaseAdmin;
    const { plan_slug } = await req.json();

    // lookup price from plans
    const { data: plan, error: pe } = await supabase
      .from("plans")
      .select("slug, stripe_price_id, name")
      .eq("slug", plan_slug)
      .single();
    if (pe || !plan?.stripe_price_id) {
      return NextResponse.json({ error: "Unknown plan or missing stripe price" }, { status: 400 });
    }

    // ensure or create stripe customer for this org
    const { data: org } = await supabase
      .from("orgs")
      .select("id, name, stripe_customer_id")
      .eq("id", orgId)
      .single();

    let customerId = org?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org?.name ?? `Org ${orgId}`,
        metadata: { orgId }
      });
      customerId = customer.id;
      await supabase.from("orgs").update({ stripe_customer_id: customerId }).eq("id", orgId);
    }

    const success = new URL("/settings?tab=general", req.url).toString();
    const cancel = new URL("/settings?tab=general", req.url).toString();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: success,
      cancel_url: cancel,
      metadata: { orgId, plan_slug },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "checkout error" }, { status: 500 });
  }
}
