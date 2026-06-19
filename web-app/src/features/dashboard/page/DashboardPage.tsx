import { AlertCircle } from "lucide-react";
import { DashboardHeader } from "../components/DashboardHeader";
import { TeamInfoSection } from "../components/TeamInfoSection";
import { ProductsTable } from "../components/ProductsTable";
import { ProductFormDialog } from "../components/ProductFormDialog";
import { useDashboardTeam } from "../hooks/useDashboardTeam";
import { useDashboardProducts } from "../hooks/useDashboardProducts";

export function DashboardPage() {
  const {
    team,
    members,
    teamLoading,
    teamError,
    currentUserId,
  } = useDashboardTeam();

  const {
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
  } = useDashboardProducts({ team });

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
          <TeamInfoSection 
            team={team} 
            members={members} 
            currentUserId={currentUserId} 
          />

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
            currentUserId={currentUserId}
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

