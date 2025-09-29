import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";

function normalizeUrl(raw: string) {
  const s = (raw || "").trim();
  if (!s) return "";
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    u.protocol = "https:";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

async function readBody(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try { return await req.json(); } catch { return {}; }
  }
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    return {
      name: String(fd.get("product_name") ?? fd.get("name") ?? ""),
      website: String(fd.get("product_website") ?? fd.get("website") ?? ""),
    };
  }
  const txt = await req.text();
  try {
    const p = new URLSearchParams(txt);
    return {
      name: p.get("product_name") ?? p.get("name") ?? "",
      website: p.get("product_website") ?? p.get("website") ?? "",
    };
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get user info directly from Clerk auth
    const { userId, orgId: clerkOrgId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }
    
    if (!clerkOrgId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    // Get Supabase org UUID from clerk_org_id
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from("orgs")
      .select("id")
      .eq("clerk_org_id", clerkOrgId)
      .single();

    if (orgError || !orgData) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const supabase = supabaseAdmin;
    const body = await readBody(req);
    const name = String(body.name ?? body.product_name ?? "").trim();
    const website = normalizeUrl(String(body.website ?? body.product_website ?? ""));

    if (!name || !website) {
      return NextResponse.json({ error: "name and website are required" }, { status: 400 });
    }

    // Update earliest vendor row for this org; or insert if none exists
    const { data: existing, error: findErr } = await supabase
      .from("vendors")
      .select("id")
      .eq("org_id", orgData.id)
      .order("created_at", { ascending: true })
      .limit(1);
    if (findErr) throw findErr;

    if (existing && existing.length > 0) {
      const { error: updErr } = await supabase
        .from("vendors")
        .update({ name, website })
        .eq("id", existing[0].id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase
        .from("vendors")
        .insert({ org_id: orgData.id, name, website });
      if (insErr) throw insErr;
    }

    return NextResponse.redirect(new URL("/settings?tab=general", req.url), { status: 303 });
  } catch (e: any) {
    console.error("Settings product save error:", e);
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}

// Optional: GET for debugging the current vendor row
export async function GET(req: NextRequest) {
  try {
    // Get user info directly from Clerk auth
    const { userId, orgId: clerkOrgId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }
    
    if (!clerkOrgId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    // Get Supabase org UUID from clerk_org_id
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from("orgs")
      .select("id")
      .eq("clerk_org_id", clerkOrgId)
      .single();

    if (orgError || !orgData) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const supabase = supabaseAdmin;
    const { data } = await supabase
      .from("vendors")
      .select("id,name,website,created_at")
      .eq("org_id", orgData.id)
      .order("created_at", { ascending: true })
      .limit(1);
    return NextResponse.json({ vendor: data?.[0] ?? null });
  } catch (e: any) {
    console.error("Settings product GET error:", e);
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}

