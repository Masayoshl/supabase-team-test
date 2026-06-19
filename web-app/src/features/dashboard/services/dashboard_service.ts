import { supabase } from "@/shared/supabase/supabase_client";
import type {
  Product,
  ProductFilters,
  Team,
  TeamMember,
} from "../types/dashboard_types";

// ── Team ─────────────────────────────────────────────────────────────────────

export async function fetchCurrentTeam(): Promise<Team> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("team_id")
    .eq("id", user.id)
    .single();

  if (userErr) throw userErr;
  if (!userRow?.team_id) throw new Error("User has no team");

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("*")
    .eq("id", userRow.team_id)
    .single();

  if (teamErr) throw teamErr;
  return team as Team;
}

// ── Team Members ─────────────────────────────────────────────────────────────

export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, team_id, created_at, name")
    .eq("team_id", teamId);

  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

// ── Products ─────────────────────────────────────────────────────────────────

export interface FetchProductsOptions {
  filters: ProductFilters;
  page: number;
  limit: number;
}

export interface FetchProductsResult {
  products: Product[];
  total: number;
  totalPages: number;
}

/**
 * Calls the edge function GET /products with all filters, search, sort and pagination.
 * Edge function enforces team scoping server-side via the JWT.
 */
export async function fetchProducts({
  filters,
  page,
  limit,
}: FetchProductsOptions): Promise<FetchProductsResult> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("sortBy", filters.sortBy);
  params.set("sortOrder", filters.sortOrder);

  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.createdBy !== "all") params.set("createdBy", filters.createdBy);
  if (filters.search.trim()) params.set("search", filters.search.trim());

  const { data, error } = await supabase.functions.invoke<{
    data: Product[];
    meta: { total: number; page: number; limit: number; total_pages: number };
  }>("products", {
    method: "GET",
    headers: { "x-query": params.toString() },
  });

  // Supabase functions.invoke doesn't support query strings natively,
  // so we pass the params via a custom header and read them in the function,
  // OR we can build the URL manually via fetch.
  // Use fetch directly to support query params properly.
  if (error) throw error;

  return {
    products: data?.data ?? [],
    total: data?.meta.total ?? 0,
    totalPages: data?.meta.total_pages ?? 1,
  };
}

// ── Products (direct fetch to support query params) ───────────────────────────

/**
 * Uses native fetch instead of supabase.functions.invoke to properly
 * pass query string parameters to the edge function.
 */
export async function fetchProductsRaw({
  filters,
  page,
  limit,
}: FetchProductsOptions): Promise<FetchProductsResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("sortBy", filters.sortBy);
  params.set("sortOrder", filters.sortOrder);

  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.createdBy !== "all") params.set("createdBy", filters.createdBy);
  if (filters.search.trim()) params.set("search", filters.search.trim());

  const url = `${supabaseUrl}/functions/v1/products?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  const body: {
    data: Product[];
    meta: { total: number; total_pages: number };
  } = await res.json();

  return {
    products: body.data ?? [],
    total: body.meta?.total ?? 0,
    totalPages: body.meta?.total_pages ?? 1,
  };
}

// ── Create Product ────────────────────────────────────────────────────────────

export interface CreateProductPayload {
  title: string;
  description?: string;
  image?: string;
}

export async function createProduct(payload: CreateProductPayload): Promise<Product> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  const body: { data: Product } = await res.json();
  return body.data;
}

// ── Update Product (draft only) ───────────────────────────────────────────────

export interface UpdateProductPayload {
  title?: string;
  description?: string | null;
  image?: string | null;
}

export async function updateProduct(
  productId: string,
  payload: UpdateProductPayload,
): Promise<Product> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/products/${productId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  const body: { data: Product } = await res.json();
  return body.data;
}

// ── Patch Product Status ──────────────────────────────────────────────────────

export type ProductStatusTransition = "active" | "deleted";

export async function patchProductStatus(
  productId: string,
  status: ProductStatusTransition,
): Promise<Product> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(
    `${supabaseUrl}/functions/v1/products/${productId}/status`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ status }),
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  const body: { data: Product } = await res.json();
  return body.data;
}

// ── Upload Product Image ──────────────────────────────────────────────────────

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const STORAGE_BUCKET = "product-images";

export class ImageUploadError extends Error {}

export async function uploadProductImage(
  teamId: string,
  productId: string,
  file: File,
): Promise<string> {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ImageUploadError(
      `Image exceeds the 5 MB limit (got ${(file.size / 1024 / 1024).toFixed(1)} MB).`,
    );
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new ImageUploadError(
      `Unsupported format. Allowed: JPEG, PNG, WebP, GIF.`,
    );
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${teamId}/${productId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new ImageUploadError(error.message);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
