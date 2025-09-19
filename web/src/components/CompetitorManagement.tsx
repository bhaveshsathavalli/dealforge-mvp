'use client';

import { useState, useEffect } from 'react';

interface Competitor {
  id: string;
  name: string;
  aliases: string[];
}

interface CompetitorFormProps {
  competitor?: Competitor;
  onSave: (competitor: Omit<Competitor, 'id'>) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

function CompetitorForm({ competitor, onSave, onCancel, isEditing = false }: CompetitorFormProps) {
  const [name, setName] = useState(competitor?.name || '');
  const [aliases, setAliases] = useState(competitor?.aliases?.join(', ') || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        aliases: aliases ? aliases.split(',').map(a => a.trim()).filter(a => a) : []
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div>
        <label className="block text-sm font-medium mb-1">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="Competitor name"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Aliases</label>
        <input
          type="text"
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="Alias1, Alias2, Alias3"
        />
        <p className="text-xs text-gray-500 mt-1">Separate multiple aliases with commas</p>
      </div>
      
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {saving ? 'Saving...' : (isEditing ? 'Update' : 'Add')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function CompetitorManagement() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);

  const loadCompetitors = async () => {
    try {
      console.log('Competitor Management: Loading competitors');
      setLoading(true);
      const response = await fetch('/api/competitors');
      const data = await response.json();
      
      if (response.ok) {
        console.log('Competitor Management: Loaded', data.competitors?.length || 0, 'competitors');
        setCompetitors(data.competitors || []);
        setError(null);
      } else {
        console.error('Competitor Management: API error:', data);
        setError(data.error || 'Failed to load competitors');
      }
    } catch (err) {
      console.error('Competitor Management: Fetch error:', err);
      setError('Failed to load competitors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompetitors();
  }, []);

  const handleAddCompetitor = async (competitorData: Omit<Competitor, 'id'>) => {
    try {
      console.log('Competitor Management: Adding competitor:', competitorData);
      const response = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(competitorData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Competitor Management: Added competitor:', data.competitor);
        setCompetitors([...competitors, data.competitor]);
        setShowForm(false);
      } else {
        console.error('Competitor Management: Add error:', data);
        setError(data.error || 'Failed to add competitor');
      }
    } catch (err) {
      console.error('Competitor Management: Add error:', err);
      setError('Failed to add competitor');
    }
  };

  const handleUpdateCompetitor = async (competitorData: Omit<Competitor, 'id'>) => {
    if (!editingCompetitor) return;
    
    try {
      console.log('Competitor Management: Updating competitor:', editingCompetitor.id, competitorData);
      const response = await fetch(`/api/competitors/${editingCompetitor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(competitorData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Competitor Management: Updated competitor:', data.competitor);
        setCompetitors(competitors.map(c => 
          c.id === editingCompetitor.id ? data.competitor : c
        ));
        setEditingCompetitor(null);
      } else {
        console.error('Competitor Management: Update error:', data);
        setError(data.error || 'Failed to update competitor');
      }
    } catch (err) {
      console.error('Competitor Management: Update error:', err);
      setError('Failed to update competitor');
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this competitor?')) return;
    
    try {
      console.log('Competitor Management: Deleting competitor:', id);
      const response = await fetch(`/api/competitors/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Competitor Management: Deleted competitor:', id);
        setCompetitors(competitors.filter(c => c.id !== id));
      } else {
        console.error('Competitor Management: Delete error:', data);
        setError(data.error || 'Failed to delete competitor');
      }
    } catch (err) {
      console.error('Competitor Management: Delete error:', err);
      setError('Failed to delete competitor');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading competitors...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Manage Competitors</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Competitor
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-800 mb-2">Error</h3>
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <CompetitorForm
          onSave={handleAddCompetitor}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingCompetitor && (
        <CompetitorForm
          competitor={editingCompetitor}
          onSave={handleUpdateCompetitor}
          onCancel={() => setEditingCompetitor(null)}
          isEditing={true}
        />
      )}

      {competitors.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No competitors found. Add your first competitor to get started.
        </div>
      ) : (
        <div className="grid gap-4">
          {competitors.map((competitor) => (
            <div key={competitor.id} className="border rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{competitor.name}</h3>
                  {competitor.aliases && competitor.aliases.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Aliases: {competitor.aliases.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setEditingCompetitor(competitor)}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCompetitor(competitor.id)}
                    className="px-3 py-1 text-sm border rounded hover:bg-red-50 text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
