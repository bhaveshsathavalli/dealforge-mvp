'use client';
import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { 
  LayoutDashboard, 
  Users, 
  Flag, 
  Bell, 
  Settings, 
  Search, 
  Play,
  Menu,
  X
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { Logo } from '@/components/logo';
import { ThemeToggleV2 } from '@/components/ui/ThemeToggleV2';
import { Button } from '@/components/ui/button';

interface AppShellV2Props {
  children: ReactNode;
  topbarRight?: ReactNode;
  containerVariant?: 'centered' | 'left';
  containerClassName?: string;
}

const navigation = [
  { name: 'Dashboard', href: '/v2', icon: LayoutDashboard, accent: 'dashboard' },
  { name: 'Competitors', href: '/v2/competitors', icon: Users, accent: 'competitors' },
  { name: 'Battlecards', href: '/v2/battlecards', icon: Flag, accent: 'battlecards' },
  { name: 'Updates', href: '/v2/updates', icon: Bell, accent: 'updates' },
  { name: 'Settings', href: '/v2/settings', icon: Settings, accent: 'settings' },
];

const getAccentColor = (accent: string) => {
  const colors = {
    dashboard: 'var(--accent-dashboard)',
    competitors: 'var(--accent-competitors)',
    battlecards: 'var(--accent-battlecards)',
    updates: 'var(--accent-updates)',
    settings: 'var(--accent-settings)',
  };
  return colors[accent as keyof typeof colors] || 'var(--text-muted)';
};

function DefaultTopbarActions() {
  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-subtle)]" />
        <input
          type="text"
          placeholder="Search..."
          className="pl-10 pr-4 py-2 w-64 rounded-lg border border-[var(--border)]
                   bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-subtle)]
                   focus:outline-none focus:ring-0 focus:border-[var(--border)] focus:shadow-none
                   !outline-none !ring-0"
          style={{ outline: 'none', boxShadow: 'none' }}
        />
      </div>
      <Button
        className="flex items-center gap-2"
        style={{ outline: 'none', boxShadow: 'none' }}
      >
        <Play className="h-4 w-4" />
        Run
      </Button>
    </>
  );
}

export function AppShellV2({ children, topbarRight, containerVariant = 'centered', containerClassName }: AppShellV2Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Compute container classes
  const base = "w-full px-6 py-4";
  const centered = "mx-auto max-w-7xl";
  const left = "max-w-7xl mr-auto";
  const containerCx = clsx(base, containerVariant === 'left' ? left : centered, containerClassName);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

            {/* Sidebar */}
            <div className={`
              fixed inset-y-0 left-0 z-50 w-64 bg-[var(--surface)] border-r border-[var(--border)]
              transform transition-transform duration-200 ease-in-out
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col lg:h-screen lg:max-h-screen
            `}>
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-xl font-semibold text-[var(--text)]">DealForge</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-[var(--surface-alt)]"
          >
            <X className="h-5 w-5 text-[var(--text-muted)]" />
          </button>
        </div>

              <nav className="px-4 py-4 space-y-2 flex-1 overflow-y-auto">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/v2' && pathname.startsWith(item.href));
                  const accentColor = getAccentColor(item.accent);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isActive
                          ? 'bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--primary)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)]'
                        }
                      `}
                    >
                      <Icon
                        className="h-5 w-5"
                        style={{ color: isActive ? accentColor : undefined }}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* Bottom controls - fixed at bottom */}
              <div className="px-4 py-4 border-t border-[var(--border)] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <ThemeToggleV2 />
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "h-8 w-8",
                        userButtonPopoverCard: "bg-[var(--surface)] border-[var(--border)]",
                        userButtonPopoverActionButton: "text-[var(--text)] hover:bg-[var(--surface-alt)]"
                      }
                    }}
                  />
                </div>
              </div>
      </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 relative lg:ml-64 lg:h-screen lg:overflow-y-auto">
        {/* Floating controls in top-right - fixed position */}
        <div className="fixed top-6 right-6 z-30 flex items-center gap-3" style={{ background: 'transparent' }}>
          <div className="flex items-center gap-2">
            {topbarRight ? topbarRight : (pathname.includes('/compare') ? null : <DefaultTopbarActions />)}
          </div>
        </div>

        {/* Mobile menu button - fixed position */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-6 left-6 z-30 p-2 rounded-md hover:bg-[var(--surface-alt)] bg-[var(--surface)] border border-[var(--border)]"
        >
          <Menu className="h-5 w-5 text-[var(--text-muted)]" />
        </button>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className={containerCx}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
