import { corsHeaders } from "./cors.ts";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function err(message: string, status: number): Response {
  return json({ error: message }, status);
}
