import { AppShell } from "@/components/layout/AppShell";

// Server component that provides org context (mirroring handled by withOrg guard)
function OrgContextProvider({ children }: { children: React.ReactNode }) {
  // Mirroring is now handled by withOrg guard in API routes
  // This component just provides the layout structure
  return <>{children}</>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgContextProvider>
      <AppShell>{children}</AppShell>
    </OrgContextProvider>
  );
}
