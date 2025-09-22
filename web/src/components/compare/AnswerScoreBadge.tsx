export function AnswerScoreBadge({ score }: { score: number }) {
  const color = score >= 0.85 ? "bg-green-500" : score >= 0.70 ? "bg-lime-500" : score >= 0.55 ? "bg-amber-500" : "bg-gray-400";
  
  return (
    <span 
      className={`inline-block w-3 h-3 rounded-sm ${color}`} 
      title={`AnswerScore ${Math.round(score * 100)}%`} 
    />
  );
}