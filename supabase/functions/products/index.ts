// deno-lint-ignore-file no-explicit-any
import { corsHeaders, handleCORS } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase_client.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// ── Constants ─────────────────────────────────────────────────────────────────

const PRODUCT_STATUSES = ["draft", "active", "deleted"] as const;
type ProductStatus = (typeof PRODUCT_STATUSES)[number];

const STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ["active", "deleted"],
  active: ["deleted"],
  deleted: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status: number): Response {
  return json({ error: message }, status);
}

async function resolveUserTeam(supabase: SupabaseClient): Promise<
  | { ok: true; userId: string; teamId: string }
  | { ok: false; response: Response }
> {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { ok: false, response: err("User authentication failed.", 401) };
  }

  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("team_id")
    .eq("id", user.id)
    .single();

  if (userErr || !userRow?.team_id) {
    return {
      ok: false,
      response: err("User does not belong to a team.", 403),
    };
  }

  return { ok: true, userId: user.id, teamId: userRow.team_id };
}

function parseProductPath(pathname: string): string[] {
  const match = pathname.match(/\/products\/?(.*)$/);
  if (!match) return [];
  return match[1].split("/").filter(Boolean);
}

// ── Schemas ───────────────────────────────────────────────────────────────────

/** GET /products — query-string params */
const listProductsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(PRODUCT_STATUSES).optional(),
  search: z.string().trim().optional(),
  /** UUID of the creator to filter by */
  createdBy: z.uuid("createdBy must be a valid UUID").optional(),
  sortBy: z.enum(["created_at", "updated_at"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/** POST /products — request body */
const createProductSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  image: z.string().trim().url("image must be a valid URL").optional(),
});

/** PATCH /products/:id — request body */
const updateProductSchema = z.object({
  title: z.string().trim().min(1, "Title must not be empty").max(200)
    .optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  // null  → explicit clear: delete file from Storage and set column to null
  // string → new URL: store it as-is (caller already uploaded to Storage)
  // absent → leave image column untouched
  image: z.url("image must be a valid URL").nullable().optional(),
});

/** PATCH /products/:id/status — request body */
const patchStatusSchema = z.object({
  status: z.enum(PRODUCT_STATUSES, {
    error: `status must be one of: ${PRODUCT_STATUSES.join(", ")}`,
  }),
});

// ── Handler: GET /products ────────────────────────────────────────────────────

async function listProducts(
  supabase: SupabaseClient,
  url: URL,
  teamId: string,
): Promise<Response> {
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = listProductsSchema.safeParse(raw);

  if (!parsed.success) {
    return err(
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(
        "; ",
      ),
      400,
    );
  }

  const { page, limit, status, search, createdBy, sortBy, sortOrder } =
    parsed.data;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("team_id", teamId)
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(from, to);

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (createdBy) {
    query = query.eq("creator_id", createdBy);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return json({
    data,
    meta: {
      total: count ?? 0,
      page,
      limit,
      total_pages: Math.ceil((count ?? 0) / limit),
    },
  });
}

// ── Handler: POST /products ───────────────────────────────────────────────────

async function createProduct(
  supabase: SupabaseClient,
  body: unknown,
  userId: string,
  teamId: string,
): Promise<Response> {
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((i) => i.message).join("; "), 400);
  }

  const { title, description, image } = parsed.data;

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      team_id: teamId,
      creator_id: userId,
      title,
      description: description ?? null,
      image: image ?? null,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw error;

  return json({ data: product }, 201);
}

// ── Handler: PATCH /products/:id/status ──────────────────────────────────────

async function patchProductStatus(
  supabase: SupabaseClient,
  productId: string,
  body: unknown,
  teamId: string,
): Promise<Response> {
  const parsed = patchStatusSchema.safeParse(body);
  if (!parsed.success) {
    return err(
      `Invalid status. Allowed values: ${PRODUCT_STATUSES.join(", ")}`,
      400,
    );
  }

  const { status: newStatus } = parsed.data;

  const { data: product, error: fetchErr } = await supabase
    .from("products")
    .select("id, status, team_id")
    .eq("id", productId)
    .eq("team_id", teamId)
    .single();

  if (fetchErr || !product) {
    return err("Product not found.", 404);
  }

  const currentStatus = product.status as ProductStatus;
  const allowed = STATUS_TRANSITIONS[currentStatus];

  if (!allowed.includes(newStatus)) {
    return err(
      `Cannot transition from '${currentStatus}' to '${newStatus}'. ` +
        (allowed.length
          ? `Allowed: ${allowed.join(", ")}.`
          : `'${currentStatus}' is a terminal state.`),
      422,
    );
  }

  const { data: updated, error: updateErr } = await supabase
    .from("products")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  return json({ data: updated });
}

// ── Handler: PATCH /products/:id ─────────────────────────────────────────────

async function patchProduct(
  supabase: SupabaseClient,
  productId: string,
  body: unknown,
  teamId: string,
): Promise<Response> {
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((i) => i.message).join("; "), 400);
  }

  const { data: product, error: fetchErr } = await supabase
    .from("products")
    .select("id, status, image, team_id")
    .eq("id", productId)
    .eq("team_id", teamId)
    .single();

  if (fetchErr || !product) {
    return err("Product not found.", 404);
  }

  if (product.status !== "draft") {
    return err(
      "Only products in 'draft' status can be edited.",
      422,
    );
  }

  const payload = parsed.data;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if ("title" in payload && payload.title !== undefined) {
    updates.title = payload.title;
  }

  if ("description" in payload) {
    // allow explicit null to clear description
    updates.description = payload.description ?? null;
  }

  if ("image" in payload) {
    if (payload.image === null) {
      if (product.image) {
        const oldPath = product.image
          .replace(/^.*\/storage\/v1\/object\/public\/[^/]+\//, "")
          .replace(/^.*\/storage\/v1\/object\/[^/]+\/[^/]+\//, "");

        await supabase.storage
          .from("product-images")
          .remove([oldPath])
          .catch(() => {/* ignore */});
      }
      updates.image = null;
    } else {
      // New path provided
      updates.image = payload.image;
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  return json({ data: updated });
}

// ── Entry Point ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const segments = parseProductPath(url.pathname);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return err("Missing authorization credentials.", 401);
    }

    const supabase = createSupabaseClient(req);
    const resolved = await resolveUserTeam(supabase);
    if (!resolved.ok) return resolved.response;

    const { userId, teamId } = resolved;

    // ── GET /products ───────────────────────────────────────────────────────
    if (req.method === "GET" && segments.length === 0) {
      return await listProducts(supabase, url, teamId);
    }

    // ── POST /products ──────────────────────────────────────────────────────
    if (req.method === "POST" && segments.length === 0) {
      const body = await req.json();
      return await createProduct(supabase, body, userId, teamId);
    }

    // ── PATCH /products/:id/status ──────────────────────────────────────────
    if (
      req.method === "PATCH" &&
      segments.length === 2 &&
      segments[1] === "status"
    ) {
      const body = await req.json();
      return await patchProductStatus(supabase, segments[0], body, teamId);
    }

    // ── PATCH /products/:id ─────────────────────────────────────────────────
    if (req.method === "PATCH" && segments.length === 1) {
      const body = await req.json();
      return await patchProduct(supabase, segments[0], body, teamId);
    }

    return err(`Endpoint ${req.method} ${url.pathname} not found.`, 404);
  } catch (error: any) {
    return json({ error: error.message ?? "Internal Server Error" }, 500);
  }
});
