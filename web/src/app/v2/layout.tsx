'use client';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '../providers/ThemeProvider';
import { AppShellV2 } from '@/components/layout/AppShellV2';

export default function V2Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // For compare pages, we need to pass topbarRight prop
  // But since this is a layout, we can't easily pass dynamic content
  // The compare page will handle its own topbarRight via the layout
  
  return (
    <ThemeProvider>
      <AppShellV2>
        {children}
      </AppShellV2>
    </ThemeProvider>
  );
}
