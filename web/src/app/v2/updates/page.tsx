import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar } from 'lucide-react';

/*
 * Future Updates Schema:
 * 
 * CREATE TABLE product_updates (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   title TEXT NOT NULL,
 *   content TEXT NOT NULL,
 *   type TEXT NOT NULL CHECK (type IN ('feature', 'improvement', 'announcement', 'maintenance', 'bugfix')),
 *   priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
 *   status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
 *   published_at TIMESTAMP WITH TIME ZONE,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   created_by TEXT NOT NULL, -- Clerk user ID
 *   tags TEXT[] DEFAULT '{}',
 *   target_audience TEXT[] DEFAULT '{}', -- ['all', 'admin', 'member', 'enterprise', 'starter']
 *   related_features TEXT[] DEFAULT '{}', -- Feature names this update relates to
 *   external_links JSONB DEFAULT '[]', -- Array of {url, title, description}
 *   changelog_items JSONB DEFAULT '[]', -- Array of {type: 'added'|'changed'|'fixed'|'removed', description}
 *   org_id UUID REFERENCES orgs(id) ON DELETE CASCADE, -- For org-specific updates
 *   clerk_org_id TEXT, -- For Clerk integration
 *   is_global BOOLEAN DEFAULT true, -- Whether this update applies to all orgs
 *   requires_action BOOLEAN DEFAULT false, -- Whether users need to take action
 *   action_url TEXT, -- URL for required action
 *   action_text TEXT -- Text for action button
 * );
 * 
 * CREATE INDEX idx_product_updates_published_at ON product_updates(published_at DESC);
 * CREATE INDEX idx_product_updates_type ON product_updates(type);
 * CREATE INDEX idx_product_updates_status ON product_updates(status);
 * CREATE INDEX idx_product_updates_org_id ON product_updates(org_id);
 * CREATE INDEX idx_product_updates_clerk_org_id ON product_updates(clerk_org_id);
 * CREATE INDEX idx_product_updates_is_global ON product_updates(is_global);
 * 
 * -- RLS Policies
 * ALTER TABLE product_updates ENABLE ROW LEVEL SECURITY;
 * 
 * -- Users can read global updates and updates for their org
 * CREATE POLICY "read_updates" ON product_updates
 *   FOR SELECT USING (
 *     is_global = true OR 
 *     clerk_org_id IN (
 *       SELECT clerk_org_id FROM org_members 
 *       WHERE clerk_user_id = auth.uid()::text
 *     )
 *   );
 * 
 * -- Only admins can create/update/delete updates
 * CREATE POLICY "manage_updates" ON product_updates
 *   FOR ALL USING (
 *     EXISTS (
 *       SELECT 1 FROM org_members 
 *       WHERE clerk_org_id = product_updates.clerk_org_id 
 *       AND clerk_user_id = auth.uid()::text 
 *       AND role = 'admin'
 *     )
 *   );
 */

export default function UpdatesV2Page() {
  const updates = [
    {
      id: 1,
      title: "New AI-Powered Research Engine",
      date: "2024-01-15",
      type: "feature",
      description: "Our latest research engine uses advanced AI to provide more accurate competitor analysis and insights.",
      link: "#"
    },
    {
      id: 2,
      title: "Enhanced Battlecard Templates",
      date: "2024-01-12",
      type: "improvement",
      description: "New customizable battlecard templates with improved citation management and sharing capabilities.",
      link: "#"
    },
    {
      id: 3,
      title: "API Rate Limits Updated",
      date: "2024-01-10",
      type: "announcement",
      description: "We've increased API rate limits for all plans. Check your new limits in the settings page.",
      link: "#"
    },
    {
      id: 4,
      title: "Mobile App Beta Release",
      date: "2024-01-08",
      type: "feature",
      description: "Try our new mobile app for iOS and Android. Access your research on the go with full functionality.",
      link: "#"
    },
    {
      id: 5,
      title: "Scheduled Maintenance",
      date: "2024-01-05",
      type: "maintenance",
      description: "Scheduled maintenance completed successfully. All systems are now running optimally.",
      link: "#"
    }
  ];

  const getTypeChip = (type: string) => {
    switch (type) {
      case 'feature':
        return <Chip variant="primary" size="sm">Feature</Chip>;
      case 'improvement':
        return <Chip variant="success" size="sm">Improvement</Chip>;
      case 'announcement':
        return <Chip variant="warning" size="sm">Announcement</Chip>;
      case 'maintenance':
        return <Chip variant="default" size="sm">Maintenance</Chip>;
      case 'bugfix':
        return <Chip variant="danger" size="sm">Bug Fix</Chip>;
      default:
        return <Chip variant="default" size="sm">{type}</Chip>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Product Updates</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            View Calendar
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {updates.map((update) => (
          <Card key={update.id} className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {getTypeChip(update.type)}
                <span className="text-sm text-[var(--text-muted)]">{update.date}</span>
              </div>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                Learn More
              </Button>
            </div>
            
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
              {update.title}
            </h3>
            <p className="text-[var(--text-muted)] mb-4">
              {update.description}
            </p>
          </Card>
        ))}
      </div>

      {/* Load More */}
      <div className="text-center">
        <Button variant="outline">Load More Updates</Button>
      </div>
    </div>
  );
}
