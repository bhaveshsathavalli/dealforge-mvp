import SourceChip from './SourceChip';

interface ChangelogCardProps {
  data: any[];
  onRefresh: () => void;
}

export default function ChangelogCard({ data, onRefresh }: ChangelogCardProps) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Changelog</h2>
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      {data.length > 0 ? (
        <div className="space-y-3">
          {data.slice(0, 5).map((entry, index) => (
            <div key={index} className="border-l-2 border-blue-200 pl-3">
              <div className="font-medium text-sm">{entry.value_json?.version || entry.subject}</div>
              <div className="text-sm text-gray-600 mt-1">
                {entry.text_summary || entry.value_json?.description || 'No description available'}
              </div>
              {entry.citations && entry.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {entry.citations.map((citation: string, i: number) => (
                    <SourceChip key={i} url={citation} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {data.length > 5 && (
            <p className="text-sm text-gray-500 italic">... and {data.length - 5} more entries</p>
          )}
        </div>
      ) : (
        <p className="text-gray-500 italic">No changelog data available</p>
      )}
    </div>
  );
}
