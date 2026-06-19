import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Zap,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { patchProductStatus } from "../services/dashboard_service";
import type {
  PaginationState,
  Product,
  ProductFilters,
  SortBy,
  TeamMember,
} from "../types/dashboard_types";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Product["status"],
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className:
      "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20",
  },
  draft: {
    label: "Draft",
    className:
      "bg-zinc-500/15 text-zinc-400 border-zinc-500/25 hover:bg-zinc-500/20",
  },
  deleted: {
    label: "Deleted",
    className: "bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/20",
  },
};

function StatusBadge({ status }: { status: Product["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={`border text-[11px] font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}


// ── Sort header button ────────────────────────────────────────────────────────

function SortHeader({
  col,
  label,
  active,
  order,
  onSort,
}: {
  col: SortBy;
  label: string;
  active: boolean;
  order: "asc" | "desc";
  onSort: (col: SortBy) => void;
}) {
  const Icon = active ? (order === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      className="flex cursor-pointer items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      {label}
      <Icon className={`size-3 ${active ? "text-emerald-400" : ""}`} />
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ProductsTableProps {
  products: Product[];
  members: TeamMember[];
  filters: ProductFilters;
  pagination: PaginationState;
  isLoading: boolean;
  onFiltersChange: (f: Partial<ProductFilters>) => void;
  onPageChange: (page: number) => void;
  onCreateClick: () => void;
  onEditClick: (product: Product) => void;
  onStatusChange: (updated: Product) => void;
}

const COLS = 8; // image, title, description, status, creator, created, updated, actions

export function ProductsTable({
  products,
  members,
  filters,
  pagination,
  isLoading,
  onFiltersChange,
  onPageChange,
  onCreateClick,
  onEditClick,
  onStatusChange,
}: ProductsTableProps) {
  const { page, total, totalPages } = pagination;

  // Per-row loading: productId → transition being applied
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});

  const memberMap = useMemo(
    () => new Map(members.map((m, i) => [m.id, m.email ?? `User ${i + 1}`])),
    [members],
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const handleSort = (col: SortBy) => {
    if (filters.sortBy === col) {
      onFiltersChange({ sortOrder: filters.sortOrder === "asc" ? "desc" : "asc" });
    } else {
      onFiltersChange({ sortBy: col, sortOrder: "desc" });
    }
  };

  const handleStatusChange = async (
    product: Product,
    to: "active" | "deleted",
  ) => {
    setRowLoading((prev) => ({ ...prev, [product.id]: true }));
    try {
      const updated = await patchProductStatus(product.id, to);
      onStatusChange(updated);
    } catch (err) {
      console.error("Status change failed", err);
    } finally {
      setRowLoading((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: title + count */}
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-200">Products</h3>
          <Badge
            variant="secondary"
            className="h-5 min-w-5 bg-zinc-800 px-1.5 text-xs text-zinc-300"
          >
            {total}
          </Badge>
        </div>

        {/* Right: search + filters + create */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
            <Input
              id="product-search"
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              placeholder="Search products…"
              className="h-8 w-52 border-zinc-700 bg-zinc-800/60 pl-8 text-xs text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-emerald-500/30"
            />
          </div>

          {/* Status filter */}
          <Select
            value={filters.status}
            onValueChange={(v) =>
              onFiltersChange({ status: v as ProductFilters["status"] })
            }
          >
            <SelectTrigger
              id="filter-status"
              className="h-8 w-34 border-zinc-700 bg-zinc-800/60 text-xs text-zinc-300 focus:ring-0"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-zinc-700 bg-zinc-900">
              <SelectItem value="all" className="text-xs">All statuses</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="draft" className="text-xs">Draft</SelectItem>
              <SelectItem value="deleted" className="text-xs">Deleted</SelectItem>
            </SelectContent>
          </Select>

          {/* Creator filter */}
          <Select
            value={filters.createdBy}
            onValueChange={(v) => onFiltersChange({ createdBy: v })}
          >
            <SelectTrigger
              id="filter-creator"
              className="h-8 w-38 border-zinc-700 bg-zinc-800/60 text-xs text-zinc-300 focus:ring-0"
            >
              <SelectValue placeholder="Creator" />
            </SelectTrigger>
            <SelectContent className="border-zinc-700 bg-zinc-900">
              <SelectItem value="all" className="text-xs">All creators</SelectItem>
              {members.map((m, idx) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.email ?? `User ${idx + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Create button */}
          <Button
            id="create-product-btn"
            size="sm"
            onClick={onCreateClick}
            className="h-8 cursor-pointer gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-500"
          >
            <Plus className="size-3.5" />
            New Product
          </Button>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}

      {/* Thin progress bar — shown while fetching, preserves layout */}
      <div className="relative h-[2px] overflow-hidden bg-transparent">
        <div
          className={`absolute inset-y-0 left-0 bg-emerald-500/70 transition-all duration-300 ${
            isLoading ? "w-full animate-pulse" : "w-0"
          }`}
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="w-12 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Photo
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Title
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Description
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Status
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Creator
              </TableHead>
              <TableHead>
                <SortHeader
                  col="created_at"
                  label="Created"
                  active={filters.sortBy === "created_at"}
                  order={filters.sortOrder}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  col="updated_at"
                  label="Updated"
                  active={filters.sortBy === "updated_at"}
                  order={filters.sortOrder}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>

          <TableBody className={`transition-opacity duration-200 ${isLoading ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
            {!isLoading && products.length === 0 ? (
              <TableRow className="border-zinc-800">
                <TableCell colSpan={COLS} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-zinc-600">
                    <Search className="size-8" />
                    <p className="text-sm">No products found</p>
                    <p className="text-xs">Try adjusting your filters or search</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.id}
                  className="border-zinc-800 transition-colors hover:bg-zinc-800/30"
                >
                  {/* Thumbnail */}
                  <TableCell>
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="h-9 w-9 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-600">
                        <Search className="size-4" />
                      </div>
                    )}
                  </TableCell>

                  {/* Title */}
                  <TableCell className="font-medium text-zinc-100">
                    {product.title}
                  </TableCell>

                  {/* Description */}
                  <TableCell className="max-w-xs">
                    <span className="line-clamp-2 text-sm text-zinc-400">
                      {product.description ?? "—"}
                    </span>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusBadge status={product.status} />
                  </TableCell>

                  {/* Creator */}
                  <TableCell className="text-sm text-zinc-400">
                    {product.creator_id
                      ? (memberMap.get(product.creator_id) ?? "Unknown")
                      : "—"}
                  </TableCell>

                  {/* Created */}
                  <TableCell className="text-sm text-zinc-500">
                    {formatDate(product.created_at)}
                  </TableCell>

                  {/* Updated */}
                  <TableCell className="text-sm text-zinc-500">
                    {formatDate(product.updated_at)}
                  </TableCell>

                  {/* Actions — context menu (hidden for deleted) */}
                  <TableCell>
                    {product.status !== "deleted" && (
                      rowLoading[product.id] ? (
                        <Loader2 className="size-4 animate-spin text-zinc-500" />
                      ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          id={`actions-${product.id}`}
                          aria-label="Product actions"
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-500 outline-none transition hover:bg-zinc-700 hover:text-zinc-200 data-popup-open:bg-zinc-700 data-popup-open:text-zinc-200"
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          align="end"
                          side="bottom"
                          className="min-w-44 border-zinc-800 bg-zinc-900 text-zinc-200"
                        >
                          {/* Edit — only while draft */}
                          {product.status === "draft" && (
                            <DropdownMenuItem
                              id={`edit-${product.id}`}
                              className="cursor-pointer gap-2 text-xs"
                              onClick={() => onEditClick(product)}
                            >
                              <Pencil className="size-3.5 text-zinc-400" />
                              Edit
                            </DropdownMenuItem>
                          )}

                          {/* Publish — draft → active */}
                          {product.status === "draft" && (
                            <DropdownMenuItem
                              id={`publish-${product.id}`}
                              className="cursor-pointer gap-2 text-xs text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-300"
                              onClick={() => handleStatusChange(product, "active")}
                            >
                              <Zap className="size-3.5" />
                              Publish
                            </DropdownMenuItem>
                          )}

                          {/* Delete — draft or active → deleted */}
                          {(product.status === "draft" || product.status === "active") && (
                            <>
                              {product.status === "draft" && (
                                <DropdownMenuSeparator className="bg-zinc-800" />
                              )}
                              <DropdownMenuItem
                                id={`delete-${product.id}`}
                                variant="destructive"
                                className="cursor-pointer gap-2 text-xs"
                                onClick={() => handleStatusChange(product, "deleted")}
                              >
                                <Trash2 className="size-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-3">
        <p className="text-xs text-zinc-500">
          Page {page} of {totalPages} · {total} total
        </p>
        <div className="flex items-center gap-1">
          <Button
            id="page-prev-btn"
            variant="ghost"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="cursor-pointer text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            // Show a window of pages around the current page
            const start = Math.max(1, Math.min(page - 3, totalPages - 6));
            const p = start + i;
            if (p > totalPages) return null;
            return (
              <button
                key={p}
                id={`page-btn-${p}`}
                onClick={() => onPageChange(p)}
                className={`flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md px-2 text-xs font-medium transition-colors ${
                  p === page
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {p}
              </button>
            );
          })}

          <Button
            id="page-next-btn"
            variant="ghost"
            size="icon-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="cursor-pointer text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
