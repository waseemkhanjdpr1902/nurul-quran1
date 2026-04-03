import { useState } from "react";
import { useListInventoryProducts, getListInventoryProductsQueryKey, useGetInventorySummary, getGetInventorySummaryQueryKey } from "@workspace/api-client-react";
import type { InventoryProduct } from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { ProductCard } from "@/components/ProductCard";
import { AddProductModal } from "@/components/AddProductModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Plus, AlertTriangle, Package2, DollarSign, Lock, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<InventoryProduct | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const { isFreeTier } = useAuth();
  const [, setLocation] = useLocation();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setTimeout(() => setDebouncedSearch(e.target.value), 300);
  };

  const { data: summary, isLoading: isLoadingSummary } = useGetInventorySummary({
    query: { queryKey: getGetInventorySummaryQueryKey() }
  });

  const { data: products, isLoading: isLoadingProducts } = useListInventoryProducts(
    { search: debouncedSearch || undefined },
    { query: { queryKey: getListInventoryProductsQueryKey({ search: debouncedSearch || undefined }) } }
  );

  const isAtFreeTierLimit = isFreeTier && summary != null && summary.totalProducts >= 100;

  const handleEdit = (product: InventoryProduct) => {
    setProductToEdit(product);
    setIsAddModalOpen(true);
  };

  const handleAddClick = () => {
    if (isAtFreeTierLimit) {
      setIsPaywallOpen(true);
      return;
    }
    setProductToEdit(null);
    setIsAddModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory</h1>
          <Button
            onClick={handleAddClick}
            size="sm"
            className="gap-2 font-medium"
            disabled={isAtFreeTierLimit}
            aria-disabled={isAtFreeTierLimit}
          >
            {isAtFreeTierLimit ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            Add
          </Button>
        </div>

        {isAtFreeTierLimit && (
          <div
            className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 flex items-center gap-3 cursor-pointer"
            role="button"
            onClick={() => setIsPaywallOpen(true)}
          >
            <Lock className="w-5 h-5 shrink-0" />
            <div className="text-sm font-medium flex-1">
              Free limit reached (100 items). Tap to upgrade.
            </div>
            <Zap className="w-4 h-4 shrink-0 text-amber-600" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Package2 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Items</span>
            </div>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{summary?.totalProducts ?? 0}</div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Value</span>
            </div>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                ${(summary?.totalValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
        </div>

        {summary && summary.lowStockCount > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="text-sm font-medium">
              {summary.lowStockCount} items are low in stock
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            className="pl-9 bg-card border-border h-11"
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground px-1 uppercase tracking-wider">
            All Products
          </h2>

          {isLoadingProducts ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))
          ) : products?.length === 0 ? (
            <div className="text-center py-12 px-4 bg-muted/30 rounded-xl border border-border border-dashed">
              <Package2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-medium text-foreground mb-1">No products found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {debouncedSearch ? "Try adjusting your search." : "Start by adding your first product to inventory."}
              </p>
              {!debouncedSearch && !isAtFreeTierLimit && (
                <Button onClick={handleAddClick} variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Add Product
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {products?.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddProductModal
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) setProductToEdit(null);
        }}
        productToEdit={productToEdit}
      />

      <Dialog open={isPaywallOpen} onOpenChange={setIsPaywallOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">Upgrade to Pro</DialogTitle>
            <DialogDescription className="text-center">
              You've reached the free limit of 100 products. Upgrade to Pro for just $5/month and add unlimited items.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              className="w-full"
              onClick={() => {
                setIsPaywallOpen(false);
                setLocation("/upgrade");
              }}
            >
              <Zap className="w-4 h-4 mr-2" />
              Upgrade Now — $5/mo
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setIsPaywallOpen(false)}>
              Maybe later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
