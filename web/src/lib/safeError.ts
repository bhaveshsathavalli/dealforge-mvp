export function serializeError(error: any): Record<string, any> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: (error as any).code,
      details: (error as any).details,
      hint: (error as any).hint,
      constraint: (error as any).constraint,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
  
  if (typeof error === 'object' && error !== null) {
    return {
      name: error.name || 'UnknownError',
      message: error.message || String(error),
      code: error.code,
      details: error.details,
      hint: error.hint,
      constraint: error.constraint
    };
  }
  
  return {
    name: 'UnknownError',
    message: String(error)
  };
}

export async function readJsonSafely(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}


