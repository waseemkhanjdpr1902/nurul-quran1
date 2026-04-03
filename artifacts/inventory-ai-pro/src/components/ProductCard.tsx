import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, AlertTriangle, Package2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteInventoryProduct, getListInventoryProductsQueryKey, getGetInventorySummaryQueryKey } from "@workspace/api-client-react";
import type { InventoryProduct } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: InventoryProduct;
  onEdit: (product: InventoryProduct) => void;
}

export function ProductCard({ product, onEdit }: ProductCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteProduct = useDeleteInventoryProduct();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isLowStock = product.quantity < 5;

  const handleDelete = () => {
    deleteProduct.mutate(
      { id: product.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInventoryProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
          toast({ title: "Product deleted" });
          setDeleteOpen(false);
        },
        onError: () => {
          toast({ title: "Failed to delete product", variant: "destructive" });
        }
      }
    );
  };

  return (
    <>
      <Card className={`overflow-hidden transition-all duration-200 hover:shadow-md ${isLowStock ? 'border-destructive/50 bg-destructive/5' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex gap-3 items-start">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${isLowStock ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Package2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground leading-tight">{product.name}</h3>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2 items-center">
                  {product.sku && <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{product.sku}</span>}
                  <span>{product.category || 'Uncategorized'}</span>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">Qty:</span>
                    <Badge variant={isLowStock ? "destructive" : "secondary"} className="font-mono text-xs">
                      {product.quantity}
                      {isLowStock && <AlertTriangle className="w-3 h-3 ml-1 inline" />}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    ${Number(product.unitPrice).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onEdit(product)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {product.name}? This action cannot be undone and will be recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteProduct.isPending}>
              {deleteProduct.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
