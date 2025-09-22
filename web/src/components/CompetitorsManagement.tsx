'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { startCompareRun } from '@/app/runs/actions';

interface Organization {
  id: string;
  name: string;
  plan_type: string;
  max_competitors: number;
}

interface Competitor {
  id: string;
  name: string;
  website?: string;
  slug?: string;
  active: boolean;
  aliases?: string[];
}

interface CompetitorsManagementProps {
  org: Organization;
  initialCompetitors: Competitor[];
}

export default function CompetitorsManagement({ org, initialCompetitors }: CompetitorsManagementProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>(initialCompetitors);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form states
  const [newCompetitor, setNewCompetitor] = useState({
    name: '',
    website: '',
    aliases: ''
  });

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompetitor.name.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const aliases = newCompetitor.aliases
        .split(',')
        .map(a => a.trim())
        .filter(a => a);

      const response = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCompetitor.name.trim(),
          website: newCompetitor.website.trim() || undefined,
          aliases
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add competitor');
      }

      const result = await response.json();
      setCompetitors(prev => [result.competitor, ...prev]);
      setNewCompetitor({ name: '', website: '', aliases: '' });
      setSuccess('Competitor added successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this competitor?')) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/competitors/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete competitor');
      }

      setCompetitors(prev => prev.filter(c => c.id !== id));
      setSuccess('Competitor deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const isAtLimit = competitors.length >= org.max_competitors;

  return (
    <div className="space-y-4">
      {/* Usage Limit Tracker */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Usage:</span>
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {competitors.length} / {org.max_competitors} used
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Add Competitor Form - only show if not at limit */}
      {!isAtLimit ? (
        <form onSubmit={handleAddCompetitor} className="flex gap-2">
          <input 
            value={newCompetitor.name}
            onChange={(e) => setNewCompetitor(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Competitor name" 
            className="flex-1 border border-border rounded px-3 py-2 bg-background text-foreground" 
            required 
            disabled={loading}
          />
          <input 
            value={newCompetitor.website}
            onChange={(e) => setNewCompetitor(prev => ({ ...prev, website: e.target.value }))}
            placeholder="Website (optional)" 
            className="flex-1 border border-border rounded px-3 py-2 bg-background text-foreground" 
            disabled={loading}
          />
          <input 
            value={newCompetitor.aliases}
            onChange={(e) => setNewCompetitor(prev => ({ ...prev, aliases: e.target.value }))}
            placeholder="Aliases (comma-separated)" 
            className="flex-1 border border-border rounded px-3 py-2 bg-background text-foreground" 
            disabled={loading}
          />
          <Button 
            type="submit" 
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add Competitor'}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-amber-600">
          You've reached your plan limit of {org.max_competitors} competitors.
        </p>
      )}

      {/* Competitors List */}
      {competitors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No competitors added yet.</p>
      ) : (
        <div className="space-y-2">
          {competitors.map(competitor => (
            <div key={competitor.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{competitor.name}</div>
                {competitor.website && (
                  <div className="text-sm text-muted-foreground">
                    <a 
                      href={competitor.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {competitor.website}
                    </a>
                  </div>
                )}
                {competitor.aliases && competitor.aliases.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Aliases: {competitor.aliases.join(', ')}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <form action={startCompareRun.bind(null, competitor.id)}>
                  <Button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
                  >
                    Run
                  </Button>
                </form>
                <Button 
                  onClick={() => handleDeleteCompetitor(competitor.id)}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
