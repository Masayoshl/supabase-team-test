import { z } from "zod";

export const createTeamSchema = z.object({
  teamName: z
    .string()
    .min(3, { message: "Team name must be at least 3 characters long" })
    .max(50, { message: "Team name must not exceed 50 characters" })
    .trim(),
});

export const joinTeamSchema = z.object({
  inviteCode: z
    .string()
    .min(1, { message: "Invite code is required" })
    .max(10, { message: "Invite code cannot be longer than 10 characters" })
    .regex(/^[A-Za-z0-9]+$/, {
      message: "Invite code must contain only letters and numbers",
    })
    .trim(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type JoinTeamInput = z.infer<typeof joinTeamSchema>;
