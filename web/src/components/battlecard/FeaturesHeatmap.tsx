import SourceChip from './SourceChip';

interface FeaturesHeatmapProps {
  data: any[];
  onRefresh: () => void;
}

export default function FeaturesHeatmap({ data, onRefresh }: FeaturesHeatmapProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'win': return 'bg-green-100 text-green-800 border-green-200';
      case 'lose': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'win': return '✓';
      case 'lose': return '✗';
      default: return '~';
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Features Heatmap</h2>
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      {data.length > 0 ? (
        <div className="space-y-2">
          {data.map((feature, index) => (
            <div key={index} className="flex items-center justify-between p-2 border rounded">
              <div className="flex-1">
                <div className="font-medium text-sm">{feature.feature}</div>
                <div className="text-xs text-gray-500">
                  Support: {feature.support} | Confidence: {Math.round(feature.confidence * 100)}%
                </div>
              </div>
              <div className={`px-2 py-1 rounded border text-xs font-medium ${getStatusColor(feature.status)}`}>
                {getStatusIcon(feature.status)} {feature.status}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic">No features data available</p>
      )}
    </div>
  );
}
