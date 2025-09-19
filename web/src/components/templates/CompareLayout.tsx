import { ReactNode } from 'react';

interface CompareLayoutProps {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}

export default function CompareLayout({ title, aside, children }: CompareLayoutProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--text)]">{title}</h1>
      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-8">{children}</section>
        <aside className="col-span-12 lg:col-span-4">{aside}</aside>
      </div>
    </div>
  );
}