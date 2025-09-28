export function serialize(error: any): Record<string, any> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  
  if (error && typeof error === 'object') {
    // Handle Supabase errors
    if (error.code || error.message || error.details || error.hint) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        constraint: error.constraint,
      };
    }
    
    // Generic object
    return {
      ...error,
      toString: error.toString?.bind(error),
    };
  }
  
  return { value: error };
}

export function logCompetitorDelete(payload: Record<string, any>) {
  try {
    console.info('competitors.delete', JSON.stringify(payload));
  } catch {
    console.info('competitors.delete', payload);
  }
}


