import type { SupabaseClient, User } from "@supabase/supabase-js";

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getAuthenticatedUser(
  supabase: SupabaseClient,
): Promise<User> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError(401, "User authentication failed.");
  }
  return user;
}

export async function resolveUserTeam(
  supabase: SupabaseClient,
): Promise<{ userId: string; teamId: string }> {
  const user = await getAuthenticatedUser(supabase);

  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("team_id")
    .eq("id", user.id)
    .single();

  if (userErr || !userRow?.team_id) {
    throw new AuthError(403, "User does not belong to a team.");
  }

  return { userId: user.id, teamId: userRow.team_id };
}
