import { NextResponse } from "next/server";
import { withOrgId, OrgContext } from "@/server/withOrg";
import { z } from "zod";
import { collectLane } from "@/server/jobs/collectVendor";

const Body = z.object({
  lanes: z
    .array(z.enum(["pricing", "features", "integrations", "trust", "changelog"]))
    .optional(),
});

export const POST = withOrgId(async (ctx: OrgContext, req: Request) => {
  const url = new URL(req.url);
  const vendorId = url.pathname.split('/')[3]; // Extract ID from /api/vendors/[id]/refresh
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid body", issues: parsed.error.format() },
      { status: 400 }
    );
  }

  const lanes =
    parsed.data.lanes ?? ["pricing", "features", "integrations", "trust", "changelog"];

  const results = [];
  for (const lane of lanes) {
    const res = await collectLane(vendorId, lane, ctx.orgId!);
    results.push(res);
  }

  return NextResponse.json({ ok: true, lanes: results });
});