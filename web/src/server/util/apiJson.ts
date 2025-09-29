/**
 * Simple API response helpers for consistent error handling
 */

export const ok = (data: any) => new Response(
  JSON.stringify({ ok: true, ...data }), 
  { 
    headers: { 'content-type': 'application/json' } 
  }
);

export const err = (status: number, message: string, extra: any = {}) => new Response(
  JSON.stringify({ ok: false, error: message, ...extra }), 
  { 
    status, 
    headers: { 'content-type': 'application/json' } 
  }
);
