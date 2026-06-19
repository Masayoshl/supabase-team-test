// deno-lint-ignore-file no-explicit-any
import { handleCORS } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase_client.ts";
import { err, json } from "../_shared/response.ts";
import {
  AuthError,
  getAuthenticatedUser,
  resolveUserTeam,
} from "../_shared/auth.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// ── Schemas ────────────────────────────────────────────────────────────────

const createTeamSchema = z.object({
  teamName: z
    .string()
    .trim()
    .min(3, "Team name is required")
    .max(50, "Team name must be at most 50 characters"),
});

const joinTeamSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(2, "Invite code is too short")
    .max(10, "Invite code is too long"),
});

// ── Handlers ───────────────────────────────────────────────────────────────

async function createTeam(
  supabase: SupabaseClient,
  body: unknown,
) {
  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error }, 400);
  }

  const { teamName } = parsed.data;

  const _user = await getAuthenticatedUser(supabase);

  const { data: team, error } = await supabase
    .from("teams")
    .insert({ name: teamName })
    .select()
    .single();

  if (error) throw error;

  return json({ data: team }, 201);
}

async function joinTeam(
  supabase: SupabaseClient,
  body: unknown,
) {
  const parsed = joinTeamSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error }, 400);
  }

  const { inviteCode } = parsed.data;

  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("invite_code", inviteCode)
    .single();

  if (teamError || !teamData) {
    return err("Invalid invite code or team does not exist.", 404);
  }

  const user = await getAuthenticatedUser(supabase);

  const { error: updateError } = await supabase
    .from("users")
    .update({ team_id: teamData.id })
    .eq("id", user.id);

  if (updateError) throw updateError;

  return json({ data: teamData }, 200);
}

async function getCurrentTeam(supabase: SupabaseClient) {
  const { teamId } = await resolveUserTeam(supabase);

  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (teamError || !teamData) {
    return err("Team not found.", 404);
  }

  return json({ data: teamData }, 200);
}

// ── Entry Point ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return err("Missing authorization credentials", 401);
    }

    const supabase = createSupabaseClient(req);

    if (path.endsWith("/create") && req.method === "POST") {
      const body = await req.json();
      return await createTeam(supabase, body);
    }

    if (path.endsWith("/join") && req.method === "POST") {
      const body = await req.json();
      return await joinTeam(supabase, body);
    }

    if (path.endsWith("/get") && req.method === "GET") {
      return await getCurrentTeam(supabase);
    }

    return err(`Endpoint ${req.method} ${url.pathname} not found`, 404);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return err(error.message, error.status);
    }
    return err(error.message || "Internal Server Error", 500);
  }
});
