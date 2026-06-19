// deno-lint-ignore-file no-explicit-any
import { corsHeaders, handleCORS } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase_client.ts";
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
    const message = parsed.error;
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { teamName } = parsed.data;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "User authentication failed." }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { data: team, error } = await supabase
    .from("teams")
    .insert({ name: teamName })
    .select()
    .single();

  if (error) throw error;

  return new Response(JSON.stringify({ data: team }), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function joinTeam(
  supabase: SupabaseClient,
  body: unknown,
) {
  const parsed = joinTeamSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error;
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { inviteCode } = parsed.data;

  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("invite_code", inviteCode)
    .single();

  if (teamError || !teamData) {
    return new Response(
      JSON.stringify({ error: "Invalid invite code or team does not exist." }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "User authentication failed." }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ team_id: teamData.id })
    .eq("id", user.id);

  if (updateError) throw updateError;

  return new Response(JSON.stringify({ data: teamData }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getCurrentTeam(supabase: SupabaseClient) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "User authentication failed." }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { data: userData, error: userFetchError } = await supabase
    .from("users")
    .select("team_id")
    .eq("id", user.id)
    .single();

  if (userFetchError || !userData?.team_id) {
    return new Response(
      JSON.stringify({ error: "User does not belong to a team." }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("id", userData.team_id)
    .single();

  if (teamError || !teamData) {
    return new Response(JSON.stringify({ error: "Team not found." }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ data: teamData }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
      return new Response(
        JSON.stringify({ error: "Missing authorization credentials" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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

    return new Response(
      JSON.stringify({
        error: `Endpoint ${req.method} ${url.pathname} not found`,
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
