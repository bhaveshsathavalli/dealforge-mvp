'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { safeJson } from '@/lib/safeJson';
import { Usage } from '@/server/usage';

type MemberRow = {
  membershipId: string;
  userId?: string;
  email: string;
  name: string;
  imageUrl?: string | null;
  role: 'admin' | 'member';
  createdAt: string;
};

type InvitationRow = {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: string;
  createdAt: string;
};

interface TeamPanelProps {
  role: 'admin' | 'member';
  usageData: Usage;
}

export default function TeamPanel({ role, usageData }: TeamPanelProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');

  const isAdmin = role === 'admin' || role === 'org:admin';

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        
        // Load members
        const membersRes = await fetch('/api/team/members');
        if (membersRes.ok) {
          const membersData = await safeJson(membersRes);
          if (!cancelled && membersData?.ok) {
            setMembers(membersData.data?.members || []);
          }
        }
        
        // Load invitations (admin only)
        if (isAdmin) {
          const invitesRes = await fetch('/api/team/invitations');
          if (invitesRes.ok) {
            const invitesData = await safeJson(invitesRes);
            if (!cancelled && invitesData?.ok) {
              setInvitations(invitesData.data?.invitations || []);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load team data:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isAdmin]);

  async function invite() {
    if (!isAdmin || !inviteEmail) return;
    
    const res = await fetch('/api/team/invitations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ email: inviteEmail, role: 'member' }),
    });
    
    const data = await safeJson(res);
    
    if (res.ok && data?.ok) {
      setInviteEmail('');
      alert('Invite sent');
      
      // Refresh invitations list
      const invitesRes = await fetch('/api/team/invitations');
      if (invitesRes.ok) {
        const invitesData = await safeJson(invitesRes);
        if (invitesData?.ok) {
          setInvitations(invitesData.data?.invitations || []);
        }
      }
    } else {
      alert('Invite failed: ' + (data?.error?.message || 'Unknown error'));
    }
  }

  async function changeRole(membershipId: string, newRole: 'admin'|'member') {
    if (!isAdmin) return;
    
    try {
      console.log('team.ui', { evt: 'change_role_start', membershipId, role: newRole });
      
      const res = await fetch(`/api/team/members/${membershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      
      const data = await safeJson(res);
      
      if (res.ok && data?.ok) {
        console.log('team.ui', { evt: 'change_role_success', membershipId });
        
        // Update UI immediately
        setMembers(ms => ms.map(m => m.membershipId === membershipId ? { ...m, role: newRole } : m));
        
        // Refresh from server for consistency
        const teamRes = await fetch('/api/team/members');
        if (teamRes.ok) {
          const teamData = await safeJson(teamRes);
          if (teamData?.ok) {
            setMembers(teamData.data?.members || []);
          }
        }
      } else {
        const errorMsg = data?.error?.message || `HTTP ${res.status}`;
        
        // Special handling for LAST_ADMIN error
        if (data?.error?.code === 'LAST_ADMIN') {
          alert("You can't remove admin privileges from the last admin. Make someone else admin first.");
        } else {
          console.error('team.ui', { evt: 'change_role_failed', membershipId, error: errorMsg });
          alert(`Role change failed: ${errorMsg}`);
        }
      }
    } catch (error: any) {
      console.error('team.ui', { evt: 'change_role_error', membershipId, error: error.message });
      alert(`Role change failed: ${error.message}`);
    }
  }

  async function remove(membershipId: string) {
    if (!isAdmin) return;
    if (!confirm('Remove this member?')) return;
    
    try {
      console.log('team.ui', { evt: 'remove_start', membershipId });
      
      const res = await fetch(`/api/team/members/${membershipId}`, {
        method: 'DELETE',
      });
      
      const data = await safeJson(res);
      
      if (res.ok && data?.ok) {
        console.log('team.ui', { evt: 'remove_success', membershipId });
        
        // Update UI immediately
        setMembers(ms => ms.filter(m => m.membershipId !== membershipId));
        
        // Refresh from server for consistency
        const teamRes = await fetch('/api/team/members');
        if (teamRes.ok) {
          const teamData = await safeJson(teamRes);
          if (teamData?.ok) {
            setMembers(teamData.data?.members || []);
          }
        }
      } else {
        const errorMsg = data?.error?.message || `HTTP ${res.status}`;
        
        // Special handling for LAST_ADMIN error
        if (data?.error?.code === 'LAST_ADMIN') {
          alert("You can't remove the last admin. Make someone else admin first.");
        } else {
          console.error('team.ui', { evt: 'remove_failed', membershipId, error: errorMsg });
          alert(`Remove failed: ${errorMsg}`);
        }
      }
    } catch (error: any) {
      console.error('team.ui', { evt: 'remove_error', membershipId, error: error.message });
      alert(`Remove failed: ${error.message}`);
    }
  }

  async function cancelInvitation(invitationId: string) {
    if (!isAdmin) return;
    if (!confirm('Cancel this invitation?')) return;
    
    const res = await fetch(`/api/team/invitations/${invitationId}`, {
      method: 'DELETE',
    });
    
    const data = await safeJson(res);
    
    if (res.ok && data?.ok) {
      setInvitations(inv => inv.filter(i => i.id !== invitationId));
    } else {
      alert('Cancel failed: ' + (data?.error?.message || 'Unknown error'));
    }
  }

  return (
    <div className="space-y-6" data-testid="team-panel">
      <h2 className="text-xl font-semibold">Team</h2>

      {!isAdmin && (
        <div className="rounded border p-3 text-sm bg-yellow-50" data-testid="role-banner">
          You're a member. Only admins can invite, change roles, or remove users.
        </div>
      )}

      <div className="rounded border p-4">
        <div className="font-medium mb-3">Members</div>
        <div className="text-sm text-muted-foreground mb-3">
          Usage: {usageData.usersUsed} / {usageData.usersLimit}
        </div>
        {loading ? (
          <div>Loading…</div>
        ) : (
          <ul className="divide-y">
            {members.map((m, index) => (
              <li 
                key={`member-${m.membershipId}-${index}`} 
                className="py-3 flex items-center justify-between gap-3"
                data-testid="member-row"
                data-membership-id={m.membershipId}
              >
                <div>
                  <div className="text-sm">{m.name || m.email}</div>
                  <div className="text-xs text-gray-500">{m.email}</div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded bg-gray-100">
                    {m.role === 'admin' ? 'Admin' : 'Member'}
                  </span>

                  {isAdmin && user?.id !== m.userId && (
                    <>
                          <select
                            className="text-sm border rounded px-2 py-1"
                            value={m.role}
                            onChange={(e) => changeRole(m.membershipId, e.target.value as 'admin'|'member')}
                            data-testid="member-role"
                          >
                            <option key="member" value="member">Member</option>
                            <option key="admin" value="admin">Admin</option>
                          </select>

                      <button
                        onClick={() => remove(m.membershipId)}
                        className="text-sm text-red-600 hover:underline"
                        data-testid="member-remove"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isAdmin && invitations.length > 0 && (
        <div className="rounded border p-4">
          <div className="font-medium mb-3">Pending Invitations</div>
          <ul className="divide-y">
            {invitations.map((inv, index) => (
              <li 
                key={`invite-${inv.id}-${index}`} 
                className="py-3 flex items-center justify-between gap-3"
                data-testid="invite-row"
              >
                <div>
                  <div className="text-sm">{inv.email}</div>
                  <div className="text-xs text-gray-500">Invited {new Date(inv.createdAt).toLocaleDateString()}</div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded bg-yellow-100">
                    {inv.role === 'admin' ? 'Admin' : 'Member'}
                  </span>

                  <button
                    onClick={() => cancelInvitation(inv.id)}
                    className="text-sm text-red-600 hover:underline"
                    data-testid="invite-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAdmin && (
        <div className="rounded border p-4">
          <div className="font-medium mb-2">Invite new member</div>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="email@company.com"
              className="border rounded px-3 py-2 flex-1"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              data-testid="invite-email"
            />
            <select
              className="border rounded px-3 py-2"
              data-testid="invite-role"
              defaultValue="member"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button 
              onClick={invite} 
              className="px-3 py-2 rounded bg-black text-white"
              data-testid="invite-submit"
            >
              Invite
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
