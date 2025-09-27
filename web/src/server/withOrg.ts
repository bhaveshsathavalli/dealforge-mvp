import { NextRequest } from "next/server";
import { getActiveOrg } from "./org";

/**
 * Wrapper function that automatically resolves the active organization
 * and passes it to the handler function.
 * 
 * Usage:
 * export const GET = withOrg(async ({ orgId }) => {
 *   // Handler logic here with orgId available
 *   return Response.json({ data: "..." });
 * });
 */
export function withOrg<T extends (ctx: { orgId: string; clerkUserId: string; clerkOrgId: string | null }) => Promise<Response>>(handler: T) {
  return async (req: NextRequest) => {
    try {
      const { orgId, clerkUserId, clerkOrgId } = await getActiveOrg();
      return handler({ orgId, clerkUserId, clerkOrgId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Response.json({ error: message }, { status: 500 });
    }
  };
}

/**
 * Alternative wrapper that only provides orgId for simpler handlers.
 * 
 * Usage:
 * export const GET = withOrgId(async ({ orgId }) => {
 *   // Handler logic here with orgId available
 *   return Response.json({ data: "..." });
 * });
 */
export function withOrgId<T extends (ctx: { orgId: string }, req?: NextRequest, context?: any) => Promise<Response>>(handler: T) {
  return async (req: NextRequest, context?: any) => {
    try {
      const { orgId } = await getActiveOrg();
      return handler({ orgId }, req, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Response.json({ error: message }, { status: 500 });
    }
  };
}
