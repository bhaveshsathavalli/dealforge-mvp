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

interface Competitor {
  id: string;
  name: string;
  website?: string;
  slug: string;
  active: boolean;
  aliases?: string[];
}

interface OrganizationSettingsProps {
  org: Organization;
  competitors: Competitor[];
}

export default function OrganizationSettings({ org, competitors }: OrganizationSettingsProps) {
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

  const handleAddCompetitor = async (formData: FormData) => {
    try {
      const response = await fetch('/api/competitors', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add competitor');
      }
      
      // Success - reload the page to show updated data
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add competitor');
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this competitor?')) return;
    
    try {
      const response = await fetch(`/api/competitors/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete competitor');
      }
      
      // Success - reload the page to show updated data
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete competitor');
    }
  };

  const canAddMoreCompetitors = competitors.length < org.max_competitors;

  return (
    <div className="rounded border p-4
           bg-white border-df-lightBorder
           dark:bg-[var(--df-dark-card)] dark:border-[var(--df-dark-border)]">
      <h2 className="text-lg font-semibold mb-4">Organization</h2>
      
      {/* Product Name Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Product Name</label>
        <input
          name="productName"
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="Enter your product name"
        />
      </div>

      {/* Product Website Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Product Website</label>
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
        {error && (
          <div className="text-red-600 text-sm mt-2">{error}</div>
        )}
        {success && (
          <div className="text-green-600 text-sm mt-2">{success}</div>
        )}
      </div>

      {/* Competitors Management */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-md font-medium">Competitors</h3>
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              {competitors.length} / {org.max_competitors} used
            </div>
          </div>
          {canAddMoreCompetitors && (
            <AddCompetitorForm onAdd={handleAddCompetitor} />
          )}
        </div>

        {!canAddMoreCompetitors && (
          <p className="text-sm text-amber-600 mb-4">
            You've reached your plan limit of {org.max_competitors} competitors.
          </p>
        )}

        {/* Competitors List */}
        {competitors.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No competitors added yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {competitors.map((competitor) => (
              <div key={competitor.id} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{competitor.name}</h4>
                    {competitor.website && (
                      <p className="text-sm text-gray-600 mt-1">
                        <a href={competitor.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {competitor.website}
                        </a>
                      </p>
                    )}
                    {competitor.aliases && competitor.aliases.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Aliases: {competitor.aliases.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button 
                      onClick={() => handleDeleteCompetitor(competitor.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Add Competitor Form Component
function AddCompetitorForm({ onAdd }: { onAdd: (formData: FormData) => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [aliases, setAliases] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('website', website.trim());
      formData.append('aliases', aliases.trim());
      
      await onAdd(formData);
      
      // Reset form
      setName('');
      setWebsite('');
      setAliases('');
      setShowForm(false);
    } catch (err) {
      // Error is handled by parent component
    } finally {
      setSaving(false);
    }
  };

  if (!showForm) {
    return (
      <Button onClick={() => setShowForm(true)} className="px-3 py-1 text-sm">
        Add Competitor
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        name="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Competitor name"
        className="border rounded px-3 py-2 text-sm"
        required
      />
      <input
        name="website"
        type="url"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        placeholder="Website (optional)"
        className="border rounded px-3 py-2 text-sm"
      />
      <input
        name="aliases"
        type="text"
        value={aliases}
        onChange={(e) => setAliases(e.target.value)}
        placeholder="Aliases (comma-separated)"
        className="border rounded px-3 py-2 text-sm"
      />
      <Button type="submit" disabled={saving} className="px-3 py-1 text-sm">
        {saving ? 'Adding...' : 'Add'}
      </Button>
      <Button 
        type="button" 
        onClick={() => setShowForm(false)} 
        className="px-3 py-1 text-sm border border-gray-300 hover:bg-gray-50"
      >
        Cancel
      </Button>
    </form>
  );
}
