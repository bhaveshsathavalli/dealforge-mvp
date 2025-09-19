import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function requireOrg() {
  const { userId, orgId } = await auth();
  console.log("[authz] Auth check:", { userId: !!userId, orgId });
  
  if (!userId) {
    console.log("[authz] No userId, redirecting to sign-in");
    redirect("/sign-in");
  }
  if (!orgId) {
    console.log("[authz] No orgId, redirecting to welcome");
    redirect("/welcome");
  }
  
  console.log("[authz] Auth passed:", { userId, orgId });
  return { userId, orgId };
}