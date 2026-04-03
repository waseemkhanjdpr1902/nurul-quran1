import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateInventoryProduct, useUpdateInventoryProduct, getListInventoryProductsQueryKey, getGetInventorySummaryQueryKey } from "@workspace/api-client-react";
import type { InventoryProduct } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  category: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantity must be 0 or greater"),
  unitPrice: z.coerce.number().min(0, "Price must be 0 or greater"),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productToEdit?: InventoryProduct | null;
  initialValues?: { name?: string; sku?: string } | null;
}

const CATEGORIES = ["Electronics", "Clothing", "Food", "Beverages", "Tools", "Office", "Other"];

export function AddProductModal({ open, onOpenChange, productToEdit, initialValues }: AddProductModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createProduct = useCreateInventoryProduct();
  const updateProduct = useUpdateInventoryProduct();

  const isEditMode = !!(productToEdit && productToEdit.id);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "Other",
      quantity: 0,
      unitPrice: 0,
    },
  });

  useEffect(() => {
    if (isEditMode) {
      form.reset({
        name: productToEdit.name,
        sku: productToEdit.sku || "",
        category: productToEdit.category || "Other",
        quantity: productToEdit.quantity,
        unitPrice: productToEdit.unitPrice,
      });
    } else if (initialValues) {
      form.reset({
        name: initialValues.name || "",
        sku: initialValues.sku || "",
        category: "Other",
        quantity: 0,
        unitPrice: 0,
      });
    } else {
      form.reset({
        name: "",
        sku: "",
        category: "Other",
        quantity: 0,
        unitPrice: 0,
      });
    }
  }, [productToEdit, initialValues, isEditMode, form, open]);

  const onSubmit = (data: ProductFormValues) => {
    if (isEditMode) {
      updateProduct.mutate(
        { id: productToEdit.id, data: { ...data } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListInventoryProductsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
            toast({ title: "Product updated successfully" });
            onOpenChange(false);
          },
          onError: () => {
            toast({ title: "Failed to update product", variant: "destructive" });
          }
        }
      );
    } else {
      createProduct.mutate(
        { data: { ...data, userId: user?.userId || "demo-user" } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListInventoryProductsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
            toast({ title: "Product added successfully" });
            onOpenChange(false);
          },
          onError: () => {
            toast({ title: "Failed to add product", variant: "destructive" });
          }
        }
      );
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Product name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional SKU" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Product"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
