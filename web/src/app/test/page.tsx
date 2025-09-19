'use client';

import { useState } from 'react';

export default function TestPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testProjectEnsure = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      const response = await fetch('/api/project/ensure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testRunStart = async () => {
    setLoading(true);
    setResult('Testing run start...');
    
    try {
      // First ensure project
      const projectResponse = await fetch('/api/project/ensure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const projectData = await projectResponse.json();
      
      if (!projectData.projectId) {
        setResult(`Project ensure failed: ${JSON.stringify(projectData, null, 2)}`);
        return;
      }
      
      // Then start run
      const runResponse = await fetch('/api/runs/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: projectData.projectId,
          query: 'test query'
        }),
      });
      
      const runData = await runResponse.json();
      setResult(`Run start result: ${JSON.stringify(runData, null, 2)}`);
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">API Test Page</h1>
      
      <div className="space-x-4">
        <button
          onClick={testProjectEnsure}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Test Project Ensure
        </button>
        
        <button
          onClick={testRunStart}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          Test Run Start
        </button>
      </div>
      
      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">Result:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {result}
        </pre>
      </div>
    </div>
  );
}
