interface LandminesListProps {
  data: string[];
  onRefresh: () => void;
}

export default function LandminesList({ data, onRefresh }: LandminesListProps) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Landmines</h2>
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      {data.length > 0 ? (
        <ul className="space-y-2">
          {data.map((landmine, index) => (
            <li key={index} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded">
              <span className="text-red-500 font-bold">⚠</span>
              <span className="text-sm text-gray-700">{landmine}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 italic">No landmines identified. Click "Compose" to generate.</p>
      )}
    </div>
  );
}
