import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { DashboardHeader } from "../components/DashboardHeader";
import { TeamInfoSection } from "../components/TeamInfoSection";
import { ProductsTable } from "../components/ProductsTable";
import { ProductFormDialog } from "../components/ProductFormDialog";
import {
  fetchCurrentTeam,
  fetchProductsRaw,
  fetchTeamMembers,
} from "../services/dashboard_service";
import type {
  PaginationState,
  Product,
  ProductFilters,
  Team,
  TeamMember,
} from "../types/dashboard_types";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 10;

const DEFAULT_FILTERS: ProductFilters = {
  status: "all",
  createdBy: "all",
  search: "",
  sortBy: "created_at",
  sortOrder: "desc",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  // ── Team ─────────────────────────────────────────────────────────────────
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState<string | null>(null);

  // ── Products ──────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  });

  // Filters + search (search is debounced before being sent)
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

  // ── Load team on mount ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setTeamLoading(true);

    (async () => {
      try {
        const fetchedTeam = await fetchCurrentTeam();
        if (cancelled) return;
        setTeam(fetchedTeam);

        const fetchedMembers = await fetchTeamMembers(fetchedTeam.id);
        if (!cancelled) setMembers(fetchedMembers);
      } catch (err) {
        if (!cancelled)
          setTeamError(err instanceof Error ? err.message : "Failed to load team");
      } finally {
        if (!cancelled) setTeamLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Debounce search input ─────────────────────────────────────────────────
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
      // reset to first page on new search
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [filters.search]);

  // ── Fetch products ────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    if (!team) return;
    setProductsLoading(true);
    try {
      const result = await fetchProductsRaw({
        filters: { ...filters, search: debouncedSearch },
        page: pagination.page,
        limit: PAGE_LIMIT,
      });
      setProducts(result.products);
      setPagination((prev) => ({
        ...prev,
        total: result.total,
        totalPages: result.totalPages,
      }));
    } catch (err) {
      console.error("Failed to fetch products", err);
    } finally {
      setProductsLoading(false);
    }
  }, [team, filters, debouncedSearch, pagination.page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFiltersChange = (partial: Partial<ProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
    // Reset page only for non-search changes (search debounce handles its own reset)
    if (!("search" in partial)) {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleCreateClick = () => {
    setEditingProduct(undefined);
    setDialogOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDialogSuccess = (product: Product) => {
    setDialogOpen(false);
    setEditingProduct(undefined);
    handleProductUpdate(product);
  };

  const handleStatusChange = (product: Product) => {
    handleProductUpdate(product);
  };

  /** Optimistic patch + background refresh shared by dialog and status changes */
  const handleProductUpdate = (product: Product) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = product;
        return next;
      }
      return [product, ...prev];
    });
    loadProducts();
  };

  // ── Render: loading ───────────────────────────────────────────────────────
  if (teamLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-950">
        <DashboardHeader />
        <main className="mx-auto w-full max-w-7xl px-6 py-8">
          <div className="space-y-4">
            <div className="h-44 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
            <div className="h-96 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
          </div>
        </main>
      </div>
    );
  }

  // ── Render: error ─────────────────────────────────────────────────────────
  if (teamError || !team) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-950">
        <DashboardHeader />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-6 py-8">
          <AlertCircle className="mb-4 size-10 text-red-400" />
          <p className="text-sm text-zinc-400">{teamError ?? "Team not found"}</p>
        </main>
      </div>
    );
  }

  // ── Render: main ──────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <DashboardHeader />

      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="space-y-6">
          <TeamInfoSection team={team} members={members} />

          <ProductsTable
            products={products}
            members={members}
            filters={filters}
            pagination={pagination}
            isLoading={productsLoading}
            onFiltersChange={handleFiltersChange}
            onPageChange={handlePageChange}
            onCreateClick={handleCreateClick}
            onEditClick={handleEditClick}
            onStatusChange={handleStatusChange}
          />
        </div>
      </main>

      {/* Create / Edit dialog */}
      <ProductFormDialog
        open={dialogOpen}
        teamId={team.id}
        product={editingProduct}
        onClose={() => {
          setDialogOpen(false);
          setEditingProduct(undefined);
        }}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
