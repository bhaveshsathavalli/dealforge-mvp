import { getActiveOrg } from "@/server/org";

export async function getOrgUuidFromClerk() {
  const { orgId, clerkUserId } = await getActiveOrg();
  return { orgUuid: orgId, userId: clerkUserId };
}
