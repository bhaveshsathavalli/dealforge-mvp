export function CitationChip({ url, score }: { url: string; score: number }) {
  const color = score >= 0.85 ? "ring-green-500" : score >= 0.70 ? "ring-lime-500" : score >= 0.55 ? "ring-amber-500" : "ring-gray-400";
  
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`inline-block px-2 py-1 text-xs rounded-full ring-1 ${color} hover:opacity-80`}
    >
      Source
    </a>
  );
}