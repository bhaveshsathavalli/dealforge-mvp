"use client";
import { SignedIn } from '@clerk/nextjs';
import { Sidebar } from './Sidebar';
import OrgContextBanner from '../OrgContextBanner';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SignedIn>
      <div className="flex min-h-screen bg-bg text-text">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <OrgContextBanner />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SignedIn>
  );
}
