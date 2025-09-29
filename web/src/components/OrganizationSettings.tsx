'use client'

import { useState } from 'react';
import { Button } from "@/components/ui/button";

interface Organization {
  id: string;
  name: string;
  product_name?: string;
  product_website?: string;
  plan_type: string;
  max_users: number;
  max_competitors: number;
}

interface Vendor {
  name: string;
  website: string;
}

interface OrganizationSettingsProps {
  org: Organization;
  competitors: any[];
  isAdmin: boolean;
  vendor: Vendor;
}

export default function OrganizationSettings({ org, competitors, isAdmin, vendor }: OrganizationSettingsProps) {
  const [detecting, setDetecting] = useState(false);

  const handleDetectWebsite = async () => {
    if (!vendor?.name?.trim()) {
      alert('Product name is required to detect website');
      return;
    }

    try {
      setDetecting(true);
      
      const response = await fetch('/api/settings/detect-website', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to detect website');
      }
      
      const { url } = await response.json();
      // Update the form field directly
      const websiteField = document.querySelector('input[name="website"]') as HTMLInputElement;
      if (websiteField) {
        websiteField.value = url;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to detect website');
    } finally {
      setDetecting(false);
    }
  };


  return (
    <div className="rounded border p-4
           bg-white border-df-lightBorder
           dark:bg-[var(--df-dark-card)] dark:border-[var(--df-dark-border)]">
      <h2 className="text-lg font-semibold mb-4">Product Information</h2>
      
      {/* Product Information - Editable */}
      <div>
        {isAdmin ? (
          <form action="/api/settings/product" method="POST" className="space-y-4">
            {/* Product Name Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Product Name</label>
              <input
                name="name"
                type="text"
                defaultValue={vendor?.name ?? ""}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Enter your product name"
                required
              />
            </div>

            {/* Product Website Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Product Website</label>
              <div className="flex gap-2">
                <input
                  name="website"
                  type="url"
                  defaultValue={vendor?.website ?? ""}
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  placeholder="https://example.com"
                />
                <Button 
                  type="button"
                  onClick={handleDetectWebsite}
                  disabled={detecting || !vendor?.name?.trim()}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-700 rounded transition-colors text-sm"
                >
                  {detecting ? 'Detecting...' : 'Auto-detect'}
                </Button>
              </div>
            </div>
            
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 rounded transition-colors"
            >
              Save
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Product Name</label>
              <div className="w-full border rounded px-3 py-2 text-sm bg-gray-50 text-gray-700">
                {vendor?.name || 'Not set'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Product Website</label>
              <div className="w-full border rounded px-3 py-2 text-sm bg-gray-50 text-gray-700">
                {vendor?.website || 'Not set'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}