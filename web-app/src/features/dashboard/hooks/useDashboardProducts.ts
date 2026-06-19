import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchProductsRaw } from '../services/dashboard_service';
import type { Product, ProductFilters, PaginationState, Team } from '../types/dashboard_types';

const PAGE_LIMIT = 10;

const DEFAULT_FILTERS: ProductFilters = {
  status: "all",
  createdBy: "all",
  search: "",
  sortBy: "created_at",
  sortOrder: "desc",
};

interface UseDashboardProductsOptions {
  team: Team | null;
}

export function useDashboardProducts({ team }: UseDashboardProductsOptions) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  });

  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [filters.search]);

  // Fetch products
  const loadProducts = useCallback(async () => {
    if (!team) return;
    // Defer loading state to next tick to avoid synchronous setState inside useEffect warning
    await Promise.resolve();
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

  const handleFiltersChange = (partial: Partial<ProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
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

  const handleDialogSuccess = (product: Product) => {
    setDialogOpen(false);
    setEditingProduct(undefined);
    handleProductUpdate(product);
  };

  const handleStatusChange = (product: Product) => {
    handleProductUpdate(product);
  };

  return {
    products,
    productsLoading,
    pagination,
    filters,
    dialogOpen,
    setDialogOpen,
    editingProduct,
    setEditingProduct,
    handleFiltersChange,
    handlePageChange,
    handleCreateClick,
    handleEditClick,
    handleDialogSuccess,
    handleStatusChange,
  };
}
