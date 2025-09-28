import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClerkClient } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/server/supabaseAdmin';

// Mock Clerk client
vi.mock('@clerk/nextjs/server', () => ({
  createClerkClient: vi.fn(),
  auth: vi.fn(),
}));

// Mock Supabase admin
vi.mock('@/server/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe('Team Management API', () => {
  const mockClerkClient = {
    users: {
      getOrganizationMembershipList: vi.fn(),
    },
  };

  const mockSupabase = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClerkClient as any).mockReturnValue(mockClerkClient);
    (supabaseAdmin.from as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/team/members', () => {
    it('should return team members for authenticated user', async () => {
      // Mock auth context
      const mockContext = {
        clerkUserId: 'user_123',
        clerkOrgId: 'org_456',
        role: 'admin' as const,
      };

      // Mock team data
      const mockTeam = [
        {
          clerk_user_id: 'user_123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
        },
        {
          clerk_user_id: 'user_789',
          email: 'member@example.com',
          name: 'Member User',
          role: 'member',
        },
      ];

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({ data: mockTeam, error: null });

      // Test the endpoint
      const response = await fetch('http://localhost:3000/api/team/members');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.ok).toBe(true);
      expect(data.data.members).toHaveLength(2);
      expect(data.data.members[0].role).toBe('admin');
    });

    it('should return 401 for unauthenticated user', async () => {
      // Mock auth failure
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Not authenticated' } });

      const response = await fetch('http://localhost:3000/api/team/members');
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('POST /api/team/members', () => {
    it('should invite new member (admin only)', async () => {
      const mockContext = {
        clerkUserId: 'user_123',
        clerkOrgId: 'org_456',
        role: 'admin' as const,
      };

      const mockProfile = { clerk_user_id: 'user_new' };
      const mockMembership = {
        clerk_user_id: 'user_new',
        clerk_org_id: 'org_456',
        role: 'member',
      };

      // Mock profile upsert
      mockSupabase.upsert.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile, error: null });

      // Mock membership upsert
      mockSupabase.single.mockResolvedValueOnce({ data: mockMembership, error: null });

      const response = await fetch('http://localhost:3000/api/team/members', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com' }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.ok).toBe(true);
      expect(data.data.membership.role).toBe('member');
    });

    it('should return 403 for non-admin user', async () => {
      const mockContext = {
        clerkUserId: 'user_789',
        clerkOrgId: 'org_456',
        role: 'member' as const,
      };

      const response = await fetch('http://localhost:3000/api/team/members', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com' }),
      });

      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PATCH /api/team/members/[membershipId]', () => {
    it('should change member role (admin only)', async () => {
      const mockContext = {
        clerkUserId: 'user_123',
        clerkOrgId: 'org_456',
        role: 'admin' as const,
      };

      const mockMembership = {
        clerk_user_id: 'user_789',
        clerk_org_id: 'org_456',
        role: 'admin',
      };

      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({ data: mockMembership, error: null });

      const response = await fetch('http://localhost:3000/api/team/members/mem_789', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'admin' }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.ok).toBe(true);
      expect(data.data.membership.role).toBe('admin');
    });
  });

  describe('DELETE /api/team/members/[membershipId]', () => {
    it('should remove member (admin only)', async () => {
      const mockContext = {
        clerkUserId: 'user_123',
        clerkOrgId: 'org_456',
        role: 'admin' as const,
      };

      const mockMembership = {
        clerk_user_id: 'user_789',
        clerk_org_id: 'org_456',
        role: 'member',
      };

      // Mock membership check
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({ data: mockMembership, error: null });

      // Mock soft delete
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({ data: mockMembership, error: null });

      const response = await fetch('http://localhost:3000/api/team/members/mem_789', {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.ok).toBe(true);
      expect(data.data.removed).toBe(true);
    });
  });
});
