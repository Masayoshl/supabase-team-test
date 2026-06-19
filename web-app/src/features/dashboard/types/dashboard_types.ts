// ── Enums ───────────────────────────────────────────────────────────────────

export type ProductStatus = "draft" | "active" | "deleted";

export interface Team {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string | null;
  created_at: string;
  name?: string | null;
  /** Joined from auth.users via edge function / RPC */
  email?: string;
}

export interface Product {
  id: string;
  team_id: string;
  creator_id: string | null;
  title: string;
  description: string | null;
  image: string | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

// ── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationState {
  /** 1-indexed, matches the API */
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Filters + Sort ────────────────────────────────────────────────────────────

export type SortBy = "created_at" | "updated_at";
export type SortOrder = "asc" | "desc";

export interface ProductFilters {
  status: ProductStatus | "all";
  createdBy: string | "all";
  search: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
}
