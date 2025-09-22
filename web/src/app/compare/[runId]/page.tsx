import { redirect } from "next/navigation";

export default async function LegacyCompareRedirect({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  redirect(`/app/compare/${runId}`);
}