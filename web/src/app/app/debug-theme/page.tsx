'use client'
import { useTheme } from '@/app/providers/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';

export default function DebugThemePage() {
  const { theme } = useTheme();
  
  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-text mb-6">Theme Debug Page</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-surface border border-border rounded-lg">
            <h2 className="text-xl font-semibold text-text mb-2">Current Theme</h2>
            <p className="text-text">Theme: <span className="font-mono bg-primary-weak px-2 py-1 rounded">{theme}</span></p>
            <p className="text-muted text-sm mt-2">
              Check the &lt;html&gt; element in DevTools - it should have data-theme="{theme}"
            </p>
          </div>
          
          <div className="p-4 bg-surface border border-border rounded-lg">
            <h2 className="text-xl font-semibold text-text mb-2">Theme Toggle</h2>
            <ThemeToggle />
            <p className="text-muted text-sm mt-2">
              Click the button above to toggle between light and dark themes
            </p>
          </div>
          
          <div className="p-4 bg-surface border border-border rounded-lg">
            <h2 className="text-xl font-semibold text-text mb-2">LocalStorage</h2>
            <p className="text-text">
              Current value: <span className="font-mono bg-primary-weak px-2 py-1 rounded">
                {typeof window !== 'undefined' ? localStorage.getItem('df-theme') || 'null' : 'N/A'}
              </span>
            </p>
            <p className="text-muted text-sm mt-2">
              The theme preference is stored in localStorage as 'df-theme'
            </p>
          </div>
          
          <div className="p-4 bg-surface border border-border rounded-lg">
            <h2 className="text-xl font-semibold text-text mb-2">Color Tokens Test</h2>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-primary text-white rounded text-center">
                Primary
              </div>
              <div className="p-3 bg-surface-alt border border-border rounded text-center text-text">
                Surface Alt
              </div>
              <div className="p-3 bg-success text-white rounded text-center">
                Success
              </div>
              <div className="p-3 bg-danger text-white rounded text-center">
                Danger
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
