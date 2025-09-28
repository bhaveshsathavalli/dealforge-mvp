'use client';

import { OrganizationProfile, useOrganization, useUser } from '@clerk/nextjs';

export default function TeamSection() {
  const { organization, membership } = useOrganization();
  const { user } = useUser();
  const role = membership?.role;

  return (
    <div className="rounded-lg border p-4
           bg-white border-df-lightBorder
           dark:bg-[var(--df-dark-card)] dark:border-[var(--df-dark-border)]">
      <h2 className="text-xl font-semibold mb-3">Team</h2>
      
      {role !== 'admin' ? (
        <div className="text-gray-600 dark:text-gray-400">
          <p>Only admins can manage team members.</p>
        </div>
      ) : (
        <OrganizationProfile
          appearance={{ elements: { rootBox: 'w-full' } }}
          routing="hash"
        />
      )}
    </div>
  );
}


