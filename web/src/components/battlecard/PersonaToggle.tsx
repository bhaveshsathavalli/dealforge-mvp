interface PersonaToggleProps {
  selectedPersona: 'AE' | 'SE' | 'Exec';
  onPersonaChange: (persona: 'AE' | 'SE' | 'Exec') => void;
}

export default function PersonaToggle({ selectedPersona, onPersonaChange }: PersonaToggleProps) {
  const personas = [
    { id: 'AE', label: 'AE', description: 'Account Executive' },
    { id: 'SE', label: 'SE', description: 'Sales Engineer' },
    { id: 'Exec', label: 'Exec', description: 'Executive' }
  ] as const;

  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      {personas.map((persona) => (
        <button
          key={persona.id}
          onClick={() => onPersonaChange(persona.id)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            selectedPersona === persona.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          title={persona.description}
        >
          {persona.label}
        </button>
      ))}
    </div>
  );
}


