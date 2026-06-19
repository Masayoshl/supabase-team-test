import { supabase } from "../../../shared/supabase/supabase_client";
import type { Team } from "@/shared/types";
import type { CreateTeamInput, JoinTeamInput } from "../schemas/onboarding_schema";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extracts a human-readable error message from an edge function response.
 * Supabase wraps FunctionsFetchError with a nested `context.error` field.
 */
function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    // Supabase SDK wraps the JSON body under `context`
    if (err.context && typeof err.context === "object") {
      const ctx = err.context as Record<string, unknown>;
      if (typeof ctx.error === "string") return ctx.error;
    }
    if (typeof err.message === "string") return err.message;
  }
  return "An unexpected error occurred.";
}

export const onboardingService = {
  /**
   * Creates a new team for the authenticated user.
   * Calls: POST /functions/v1/teams/create
   */
  createTeam: async (payload: CreateTeamInput): Promise<Team> => {
    const { data, error } = await supabase.functions.invoke<{ data: Team }>(
      "teams/create",
      {
        method: "POST",
        body: payload,
      },
    );

    if (error) throw new Error(extractErrorMessage(error));
    if (!data?.data) throw new Error("Unexpected response from server.");

    return data.data;
  },

  /**
   * Joins an existing team using an invite code.
   * Calls: POST /functions/v1/teams/join
   */
  joinTeam: async (payload: JoinTeamInput): Promise<Team> => {
    const { data, error } = await supabase.functions.invoke<{ data: Team }>(
      "teams/join",
      {
        method: "POST",
        body: payload,
      },
    );

    if (error) throw new Error(extractErrorMessage(error));
    if (!data?.data) throw new Error("Unexpected response from server.");

    return data.data;
  },

  /**
   * Fetches the current team of the authenticated user.
   * Calls: GET /functions/v1/teams/get
   */
  getTeam: async (): Promise<Team> => {
    const { data, error } = await supabase.functions.invoke<{ data: Team }>(
      "teams/get",
      {
        method: "GET",
      },
    );

    if (error) throw new Error(extractErrorMessage(error));
    if (!data?.data) throw new Error("Unexpected response from server.");

    return data.data;
  },
};
