import SourceChip from './SourceChip';

interface TrustCardProps {
  data: {
    badges: any[];
    links: any[];
  };
  onRefresh: () => void;
}

export default function TrustCard({ data, onRefresh }: TrustCardProps) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Trust & Security</h2>
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      <div className="space-y-4">
        {/* Badges */}
        <div>
          <h3 className="font-medium mb-2">Certifications</h3>
          {data.badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.badges.map((badge, index) => (
                <div key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                  {badge.value_json?.badge || badge.text_summary}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic text-sm">No certifications found</p>
          )}
        </div>

        {/* Links */}
        <div>
          <h3 className="font-medium mb-2">Security Resources</h3>
          {data.links.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.links.map((link, index) => (
                <SourceChip 
                  key={index} 
                  url={link.value_json?.url || link.text_summary} 
                  title={link.value_json?.title || 'Security Resource'}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic text-sm">No security resources found</p>
          )}
        </div>
      </div>
    </div>
  );
}


