import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  
  if (!userId) {
    // User not authenticated - redirect to sign-in
    redirect("/sign-in");
  }

  // User is authenticated - redirect to auth callback to handle org logic
  redirect("/auth/callback");
}
