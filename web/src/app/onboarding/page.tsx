"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function Onboarding() {
  const router = useRouter();
  const { userId, orgId } = useAuth();
  const [step, setStep] = useState(1);
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("");
  const [competitors, setCompetitors] = useState([
    { name: "", url: "", aliases: "" },
  ]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check authentication and admin status
  useEffect(() => {
    if (!userId || !orgId) {
      router.replace('/');
      return;
    }
    
    // TODO: Check if user is admin of the org
    // For now, we'll assume they are admin if they can access this page
    setLoading(false);
  }, [userId, orgId, router]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        {loading ? "Loading..." : "Onboarding"}
      </h1>
      
      {loading && (
        <div className="text-center py-8 text-gray-500">
          Loading your onboarding data...
        </div>
      )}
      
      {!loading && (
        <>
          {/* Admin-only notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-700">
              <strong>Admin Access Required:</strong> Only organization admins can complete onboarding.
            </p>
          </div>
        </>
      )}
      
      {!loading && step === 1 && (
        <div className="space-y-3">
          <label className="block">
            Product name
            <input
              className="w-full border rounded px-3 py-2"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="HelpdeskCo"
            />
          </label>
          <label className="block">
            Category
            <input
              className="w-full border rounded px-3 py-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Customer support software"
            />
          </label>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 bg-black text-white rounded"
              onClick={() => setStep(2)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {!loading && step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Add up to 5 competitors.</p>
          {competitors.map((c, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input
                className="border rounded px-2 py-2"
                placeholder="Name"
                value={c.name}
                onChange={(e) => {
                  const arr = [...competitors];
                  arr[i].name = e.target.value;
                  setCompetitors(arr);
                }}
              />
              <input
                className="border rounded px-2 py-2"
                placeholder="Website (optional)"
                value={c.url}
                onChange={(e) => {
                  const arr = [...competitors];
                  arr[i].url = e.target.value;
                  setCompetitors(arr);
                }}
              />
              <input
                className="border rounded px-2 py-2"
                placeholder="Aliases (comma‑sep)"
                value={c.aliases}
                onChange={(e) => {
                  const arr = [...competitors];
                  arr[i].aliases = e.target.value;
                  setCompetitors(arr);
                }}
              />
            </div>
          ))}
          <button
            className="text-sm underline"
            onClick={() =>
              setCompetitors([
                ...competitors,
                { name: "", url: "", aliases: "" },
              ])
            }
          >
            + Add another
          </button>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 border rounded"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button
              className="px-3 py-2 bg-black text-white rounded"
              onClick={() => setStep(4)}
            >
              Complete Setup
            </button>
          </div>
        </div>
      )}

      {!loading && step === 4 && (
        <div className="space-y-3">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold mb-4">Ready to start!</h2>
            <p className="text-gray-600 mb-6">
              Your competitive intelligence workspace is set up. Let's create your first analysis.
            </p>
            <button
              className="px-6 py-3 bg-black text-white rounded-lg disabled:opacity-50"
              disabled={isUpdating}
              onClick={async () => {
                try {
                  setIsUpdating(true);
                  console.log("Onboarding: Starting completion process");
                  
                  // Prepare the data to send
                  const onboardingData = {
                    product,
                    category,
                    competitors: competitors.filter(c => c.name.trim()), // Only send competitors with names
                  };
                  
                  console.log("Onboarding: Sending data:", onboardingData);
                  
                  // Mark onboarding as completed
                  const response = await fetch("/api/user/onboarding-complete", {
                    method: "POST",
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(onboardingData)
                  });
                  
                  console.log("Onboarding: API response status:", response.status);
                  
                  if (response.ok) {
                    const data = await response.json();
                    console.log("Onboarding: Success:", data);
                    router.replace("/app");
                  } else {
                    const errorText = await response.text();
                    console.error("Onboarding API failed:", errorText);
                    router.replace("/app");
                  }
                } catch (error) {
                  console.error("Failed to mark onboarding complete:", error);
                  router.replace("/app");
                } finally {
                  setIsUpdating(false);
                }
              }}
            >
              {isUpdating ? "Setting up..." : "Start first analysis"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
