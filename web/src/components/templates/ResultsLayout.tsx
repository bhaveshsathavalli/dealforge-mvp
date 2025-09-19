import { ReactNode } from 'react';

interface ResultsLayoutProps {
  title: string;
  toolbar?: ReactNode;
  children: ReactNode;
}

export function ResultsLayout({ title, toolbar, children }: ResultsLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">{title}</h1>
        {toolbar && (
          <div className="flex items-center gap-3">
            {toolbar}
          </div>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
