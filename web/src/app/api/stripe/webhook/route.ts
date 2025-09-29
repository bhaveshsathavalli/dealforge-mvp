import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/server/supabaseAdmin";

// Required environment variables:
// STRIPE_SECRET_KEY=sk_live_or_test_xxx
// STRIPE_WEBHOOK_SECRET=whsec_xxx (from Stripe dashboard)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const supabase = supabaseAdmin;
  const raw = await req.text();
  const sig = headers().get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, endpointSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId as string | undefined;
        if (!orgId) break;

        // get subscription & customer
        const subId = session.subscription as string | null;
        const customerId = session.customer as string | null;
        if (customerId) {
          await supabase.from("orgs").update({ stripe_customer_id: customerId }).eq("id", orgId);
        }
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const priceId = sub.items.data[0].price.id;

          // map price → plan
          const { data: plan } = await supabase
            .from("plans")
            .select("id, slug")
            .eq("stripe_price_id", priceId)
            .single();

          const patch: any = {
            stripe_subscription_id: subId,
            subscription_status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          };
          if (plan?.id) {
            patch.plan_id = plan.id;
            patch.plan_type = plan.slug; // legacy cache
          }

          await supabase.from("orgs").update(patch).eq("id", orgId);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        // find org by customer
        const { data: org } = await supabase
          .from("orgs")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (!org) break;

        const priceId = sub.items.data[0].price.id;
        const { data: plan } = await supabase
          .from("plans")
          .select("id, slug")
          .eq("stripe_price_id", priceId)
          .single();

        const patch: any = {
          stripe_subscription_id: sub.id,
          subscription_status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        };
        if (plan?.id) {
          patch.plan_id = plan.id;
          patch.plan_type = plan.slug;
        }
        await supabase.from("orgs").update(patch).eq("id", org.id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const { data: org } = await supabase
          .from("orgs")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (!org) break;

        await supabase.from("orgs").update({
          subscription_status: sub.status,
          stripe_subscription_id: null,
          cancel_at_period_end: false,
          current_period_end: null
        }).eq("id", org.id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "webhook error" }, { status: 500 });
  }
}

export const config = { api: { bodyParser: false } };
