import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/Chip';
import { Save, Bell, User, Shield, Users, UserPlus, AlertCircle } from 'lucide-react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function SettingsV2Page() {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  if (!orgId) {
    redirect('/welcome');
  }

  const sb = supabaseServer();

  // Get org data with caps
  const { data: org, error: orgError } = await sb
    .from('orgs')
    .select(`
      id,
      name,
      plan_name,
      max_users,
      max_competitors,
      onboarding_completed
    `)
    .eq('clerk_org_id', orgId)
    .single();

  // Get current user count
  const { count: userCount } = await sb
    .from('org_members')
    .select('*', { count: 'exact', head: true })
    .eq('clerk_org_id', orgId);

  // Get current competitor count
  const { count: competitorCount } = await sb
    .from('competitors')
    .select('*', { count: 'exact', head: true })
    .eq('clerk_org_id', orgId);

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'team', label: 'Team', icon: Users }
  ];

  const planName = org?.plan_name || 'Starter';
  const maxUsers = org?.max_users || 5;
  const maxCompetitors = org?.max_competitors || 5;
  const currentUsers = userCount || 0;
  const currentCompetitors = competitorCount || 0;

  const canAddUsers = currentUsers < maxUsers;
  const canAddCompetitors = currentCompetitors < maxCompetitors;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Settings</h1>
        <Button className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <Card className="p-4">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)]"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </Card>

        {/* Settings Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* General Settings */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">General Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  defaultValue={org?.name || ''}
                  placeholder="Enter organization name"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Current Plan
                </label>
                <div className="flex items-center gap-2">
                  <Chip variant="primary" size="sm">{planName}</Chip>
                  <Button variant="outline" size="sm">Upgrade</Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Team Management */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Team Management</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[var(--surface-alt)] rounded-lg">
                <div>
                  <h4 className="font-medium text-[var(--text)]">Users</h4>
                  <p className="text-sm text-[var(--text-muted)]">
                    {currentUsers} of {maxUsers} users
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!canAddUsers && (
                    <div className="flex items-center gap-1 text-[var(--warning)]">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Limit reached</span>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1"
                    disabled={!canAddUsers}
                  >
                    <UserPlus className="h-3 w-3" />
                    Invite User
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[var(--surface-alt)] rounded-lg">
                <div>
                  <h4 className="font-medium text-[var(--text)]">Competitors</h4>
                  <p className="text-sm text-[var(--text-muted)]">
                    {currentCompetitors} of {maxCompetitors} competitors
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!canAddCompetitors && (
                    <div className="flex items-center gap-1 text-[var(--warning)]">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Limit reached</span>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1"
                    disabled={!canAddCompetitors}
                  >
                    <UserPlus className="h-3 w-3" />
                    Add Competitor
                  </Button>
                </div>
              </div>

              {/* Invite User Form */}
              <div className="mt-6 p-4 border border-[var(--border)] rounded-lg">
                <h5 className="font-medium text-[var(--text)] mb-3">Invite Team Member</h5>
                <form className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="colleague@company.com"
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">
                      Role
                    </label>
                    <select className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                      <option>Member</option>
                      <option>Admin</option>
                    </select>
                  </div>
                  <Button 
                    type="submit" 
                    className="flex items-center gap-2"
                    disabled={!canAddUsers}
                  >
                    <UserPlus className="h-4 w-4" />
                    Send Invite
                  </Button>
                </form>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-[var(--text)]">Email Notifications</h4>
                  <p className="text-sm text-[var(--text-muted)]">Receive updates via email</p>
                </div>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-[var(--text)]">Research Complete Alerts</h4>
                  <p className="text-sm text-[var(--text-muted)]">Get notified when research runs finish</p>
                </div>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-[var(--text)]">Weekly Reports</h4>
                  <p className="text-sm text-[var(--text-muted)]">Receive weekly summary reports</p>
                </div>
                <input type="checkbox" className="rounded" />
              </div>
            </div>
          </Card>

          {/* Security */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Security</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-[var(--text)] mb-2">Two-Factor Authentication</h4>
                <p className="text-sm text-[var(--text-muted)] mb-3">Add an extra layer of security to your account</p>
                <Button variant="outline">Enable 2FA</Button>
              </div>
              <div>
                <h4 className="font-medium text-[var(--text)] mb-2">API Keys</h4>
                <p className="text-sm text-[var(--text-muted)] mb-3">Manage your API access keys</p>
                <Button variant="outline">Manage Keys</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
