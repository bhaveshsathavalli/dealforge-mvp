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

interface OrganizationSettingsProps {
  org: Organization;
  competitors: any[];
  isAdmin: boolean;
}

export default function OrganizationSettings({ org, competitors, isAdmin }: OrganizationSettingsProps) {
  const [productName, setProductName] = useState(org.product_name || '');
  const [productWebsite, setProductWebsite] = useState(org.product_website || '');
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSaveProduct = async () => {
    // Check if there are any changes
    if (productName === org.product_name && productWebsite === (org.product_website || '')) {
      setSuccess('No changes to save');
      setTimeout(() => setSuccess(null), 2000);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/settings/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          website: productWebsite || undefined
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update product information');
      }
      
      // Success - show success message
      setSuccess('Product information saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product information');
    } finally {
      setSaving(false);
    }
  };

  const handleDetectWebsite = async () => {
    if (!productName.trim()) {
      setError('Product name is required to detect website');
      return;
    }

    try {
      setDetecting(true);
      setError(null);
      
      const response = await fetch('/api/settings/detect-website', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to detect website');
      }
      
      const { url } = await response.json();
      setProductWebsite(url);
      setSuccess('Website detected successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect website');
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
        
        {/* Product Name Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Product Name</label>
          {isAdmin ? (
            <input
              name="productName"
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Enter your product name"
            />
          ) : (
            <div className="w-full border rounded px-3 py-2 text-sm bg-gray-50 text-gray-700">
              {productName || 'Not set'}
            </div>
          )}
        </div>

        {/* Product Website Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Product Website</label>
          {isAdmin ? (
            <div className="flex gap-2">
              <input
                name="productWebsite"
                type="url"
                value={productWebsite}
                onChange={(e) => setProductWebsite(e.target.value)}
                className="flex-1 border rounded px-3 py-2 text-sm"
                placeholder="https://example.com"
              />
              <Button 
                onClick={handleDetectWebsite}
                disabled={detecting || !productName.trim()}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-700 rounded transition-colors text-sm"
              >
                {detecting ? 'Detecting...' : 'Auto-detect'}
              </Button>
              <Button 
                onClick={handleSaveProduct}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 rounded transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          ) : (
            <div className="w-full border rounded px-3 py-2 text-sm bg-gray-50 text-gray-700">
              {productWebsite || 'Not set'}
            </div>
          )}
          {error && (
            <div className="text-red-600 text-sm mt-2">{error}</div>
          )}
          {success && (
            <div className="text-green-600 text-sm mt-2">{success}</div>
          )}
        </div>
      </div>
    </div>
  );
}