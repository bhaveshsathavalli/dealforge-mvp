import { ReactNode } from 'react';

interface CompareLayoutProps {
  title: string;
  aside?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export default function CompareLayout({ title, aside, actions, children }: CompareLayoutProps) {
  return (
    <div className="space-y-6">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[var(--text)]">{title}</h1>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
        
        {/* Grid layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Main column */}
          <section className="col-span-12 lg:col-span-8">
            {children}
          </section>
          
          {/* Aside column */}
          <aside className="col-span-12 lg:col-span-4">
            {aside}
          </aside>
        </div>
    </div>
  );
}
