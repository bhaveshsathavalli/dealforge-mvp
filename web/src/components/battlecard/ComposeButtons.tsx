interface ComposeButtonsProps {
  onCompose: () => void;
}

export default function ComposeButtons({ onCompose }: ComposeButtonsProps) {
  return (
    <button
      onClick={onCompose}
      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
    >
      Compose
    </button>
  );
}
