"use server";

import { runCompareFactsPipeline } from "./actions";
import { redirect } from "next/navigation";

export async function runNowAction(youName: string, compName: string, orgId: string) {
  const result = await runCompareFactsPipeline({ orgId, youName, compName });
  
  if (result.ok) {
    redirect(`/app/compare/${result.runId}`);
  } else {
    throw new Error(`Pipeline failed: ${result.reason}`);
  }
}