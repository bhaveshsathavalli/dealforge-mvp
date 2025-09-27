import { getActiveOrg } from "@/server/org";

export async function withOrgScope<T>(fn: (orgId: string) => Promise<T>): Promise<T> {
  const { orgId } = await getActiveOrg();
  return fn(orgId);
}
