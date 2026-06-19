import { z } from "zod";

export const productFormSchema = z.object({
  title: z
    .string()
    .min(1, { message: "Title is required" })
    .max(200, { message: "Title must not exceed 200 characters" })
    .trim(),
  description: z
    .string()
    .max(2000, { message: "Description must not exceed 2000 characters" })
    .trim()
    .optional(),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
