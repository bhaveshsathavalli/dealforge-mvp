import { ensureDbOrg } from "@/server/ensureOrg";

export async function withOrgScope<T>(fn: (orgId: string) => Promise<T>): Promise<T> {
  const { dbOrgId } = await ensureDbOrg();
  return fn(dbOrgId);
}
