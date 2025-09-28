interface SourceChipProps {
  url: string;
  title?: string;
  className?: string;
}

export default function SourceChip({ url, title, className = '' }: SourceChipProps) {
  const domain = new URL(url).hostname;
  const displayTitle = title || domain;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors ${className}`}
      title={url}
    >
      <span className="truncate max-w-32">{displayTitle}</span>
      <svg className="w-3 h-3 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}


