interface SourceChipProps {
  sourceId?: string;
  url?: string;
  title?: string;
}

export function SourceChip({ sourceId, url, title }: SourceChipProps) {
  const displayText = title || extractDomainFromUrl(url) || `Source ${sourceId}`;
  const hasUrl = !!url;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      hasUrl 
        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
        : 'bg-gray-100 text-gray-700'
    }`}>
      {hasUrl ? (
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {displayText}
        </a>
      ) : (
        displayText
      )}
    </span>
  );
}

function extractDomainFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
