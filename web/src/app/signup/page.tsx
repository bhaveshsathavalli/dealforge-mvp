"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new Clerk sign-up page
    router.replace("/sign-up");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Redirecting...</h2>
        <p className="text-gray-600">Taking you to the new sign-up page.</p>
      </div>
    </div>
  );
}
