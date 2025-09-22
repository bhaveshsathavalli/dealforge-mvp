"use server";

import { runCompareFactsPipeline } from "@/app/compare/actions";
import { redirect } from "next/navigation";

export async function createTestComparison(orgId: string) {
  const result = await runCompareFactsPipeline({
    orgId,
    youName: "Your Product",
    compName: "Competitor"
  });
  
  if (result.ok) {
    redirect(`/app/compare/${result.runId}`);
  } else {
    throw new Error(`Pipeline failed: ${result.reason}`);
  }
}