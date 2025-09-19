'use client';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default function V2IndexPage() {
  const links = [
    { href: '/v2/results/demo', label: 'Results Demo', description: 'View research results with citations' },
    { href: '/v2/compare/demo', label: 'Compare Demo', description: 'Compare competitors side by side' },
    { href: '/v2/battlecards/demo', label: 'Battlecards Demo', description: 'Create and manage battlecards' },
    { href: '/v2/history', label: 'History', description: 'View past research runs' },
    { href: '/v2/settings', label: 'Settings', description: 'Configure your preferences' },
    { href: '/v2/updates', label: 'Updates', description: 'Latest product updates' },
  ];

  const handleLinkClick = (href: string) => {
    console.log('Link clicked:', href);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Dashboard</h1>
        <p className="text-[var(--text-muted)]">Explore the new interface and features</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {links.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => handleLinkClick(link.href)}>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
                {link.label}
              </h3>
              <p className="text-[var(--text-muted)]">
                {link.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
