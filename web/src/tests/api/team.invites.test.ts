import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: {
    organizations: {
      getOrganizationMembershipList: vi.fn(),
      updateOrganizationMembership: vi.fn(),
      deleteOrganizationMembership: vi.fn(),
      getOrganizationInvitationList: vi.fn(),
      createOrganizationInvitation: vi.fn(),
      revokeOrganizationInvitation: vi.fn(),
    }
  }
}));

// Import after mocking
import { auth, clerkClient } from '@clerk/nextjs/server';
import { GET as getMembers } from '@/app/api/team/members/route';
import { PATCH as patchMember, DELETE as deleteMember } from '@/app/api/team/members/[membershipId]/route';
import { GET as getInvitations, POST as postInvitation } from '@/app/api/team/invitations/route';
import { DELETE as deleteInvitation } from '@/app/api/team/invitations/[invitationId]/route';

const mockAdminAuth = {
  userId: 'user_admin123',
  orgId: 'org_123',
  sessionClaims: { org_role: 'org:admin' }
};

const mockMemberAuth = {
  userId: 'user_member456',
  orgId: 'org_123',
  sessionClaims: { org_role: 'org:member' }
};

const mockUnauthenticatedAuth = {
  userId: null,
  orgId: null,
  sessionClaims: null
};

describe('Team API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/team/members', () => {
    it('should return members for authenticated user', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminAuth);
      
      const mockMembers = [
        {
          id: 'mem_1',
          publicUserData: {
            identifier: 'user1@example.com',
            firstName: 'John',
            lastName: 'Doe',
            imageUrl: 'https://example.com/avatar1.jpg'
          },
          role: 'org:admin',
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'mem_2',
          publicUserData: {
            identifier: 'user2@example.com',
            firstName: 'Jane',
            lastName: 'Smith'
          },
          role: 'org:member',
          createdAt: '2024-01-02T00:00:00.000Z'
        }
      ];

      vi.mocked(clerkClient.organizations.getOrganizationMembershipList).mockResolvedValue({
        data: mockMembers
      } as any);

      const request = new NextRequest('http://localhost:3000/api/team/members');
      const response = await getMembers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.members).toHaveLength(2);
      expect(data.data.members[0]).toEqual({
        id: 'mem_1',
        email: 'user1@example.com',
        name: 'John Doe',
        imageUrl: 'https://example.com/avatar1.jpg',
        role: 'org:admin',
        createdAt: '2024-01-01T00:00:00.000Z'
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(auth).mockResolvedValue(mockUnauthenticatedAuth);

      const request = new NextRequest('http://localhost:3000/api/team/members');
      const response = await getMembers(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('UNAUTHENTICATED');
    });

    it('should return 400 for user without org', async () => {
      vi.mocked(auth).mockResolvedValue({
        ...mockAdminAuth,
        orgId: null
      });

      const request = new NextRequest('http://localhost:3000/api/team/members');
      const response = await getMembers(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('NO_ORG');
    });
  });

  describe('PATCH /api/team/members/:membershipId', () => {
    it('should update member role for admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminAuth);
      vi.mocked(clerkClient.organizations.updateOrganizationMembership).mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/team/members/mem_1', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'org:member' })
      });
      
      const response = await patchMember(request, { params: { membershipId: 'mem_1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(clerkClient.organizations.updateOrganizationMembership).toHaveBeenCalledWith('mem_1', { role: 'org:member' });
    });

    it('should return 403 for non-admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockMemberAuth);

      const request = new NextRequest('http://localhost:3000/api/team/members/mem_1', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'org:member' })
      });
      
      const response = await patchMember(request, { params: { membershipId: 'mem_1' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should validate role input', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminAuth);

      const request = new NextRequest('http://localhost:3000/api/team/members/mem_1', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'invalid_role' })
      });
      
      const response = await patchMember(request, { params: { membershipId: 'mem_1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/team/members/:membershipId', () => {
    it('should remove member for admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminAuth);
      vi.mocked(clerkClient.organizations.deleteOrganizationMembership).mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/team/members/mem_1', {
        method: 'DELETE'
      });
      
      const response = await deleteMember(request, { params: { membershipId: 'mem_1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(clerkClient.organizations.deleteOrganizationMembership).toHaveBeenCalledWith('mem_1');
    });

    it('should return 403 for non-admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockMemberAuth);

      const request = new NextRequest('http://localhost:3000/api/team/members/mem_1', {
        method: 'DELETE'
      });
      
      const response = await deleteMember(request, { params: { membershipId: 'mem_1' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/team/invitations', () => {
    it('should return invitations for admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminAuth);
      
      const mockInvitations = [
        {
          id: 'inv_1',
          emailAddress: 'pending1@example.com',
          role: 'org:member',
          status: 'pending',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      vi.mocked(clerkClient.organizations.getOrganizationInvitationList).mockResolvedValue({
        data: mockInvitations
      } as any);

      const request = new NextRequest('http://localhost:3000/api/team/invitations');
      const response = await getInvitations(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.invitations).toHaveLength(1);
      expect(data.data.invitations[0]).toEqual({
        id: 'inv_1',
        emailAddress: 'pending1@example.com',
        role: 'org:member',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      });
    });

    it('should return 403 for non-admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockMemberAuth);

      const request = new NextRequest('http://localhost:3000/api/team/invitations');
      const response = await getInvitations(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/team/invitations', () => {
    it('should create invitation for admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminAuth);
      
      const mockInvitation = {
        id: 'inv_new',
        emailAddress: 'newuser@example.com',
        role: 'org:member',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      vi.mocked(clerkClient.organizations.createOrganizationInvitation).mockResolvedValue(mockInvitation as any);

      const request = new NextRequest('http://localhost:3000/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: 'newuser@example.com', role: 'org:member' })
      });
      
      const response = await postInvitation(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.invitation).toEqual(mockInvitation);
      expect(clerkClient.organizations.createOrganizationInvitation).toHaveBeenCalledWith({
        organizationId: 'org_123',
        emailAddress: 'newuser@example.com',
        role: 'org:member'
      });
    });

    it('should validate email format', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminAuth);

      const request = new NextRequest('http://localhost:3000/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' })
      });
      
      const response = await postInvitation(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 for non-admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockMemberAuth);

      const request = new NextRequest('http://localhost:3000/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: 'newuser@example.com' })
      });
      
      const response = await postInvitation(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/team/invitations/:invitationId', () => {
    it('should cancel invitation for admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminAuth);
      vi.mocked(clerkClient.organizations.revokeOrganizationInvitation).mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/team/invitations/inv_1', {
        method: 'DELETE'
      });
      
      const response = await deleteInvitation(request, { params: { invitationId: 'inv_1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(clerkClient.organizations.revokeOrganizationInvitation).toHaveBeenCalledWith('inv_1');
    });

    it('should return 403 for non-admin', async () => {
      vi.mocked(auth).mockResolvedValue(mockMemberAuth);

      const request = new NextRequest('http://localhost:3000/api/team/invitations/inv_1', {
        method: 'DELETE'
      });
      
      const response = await deleteInvitation(request, { params: { invitationId: 'inv_1' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });
});
