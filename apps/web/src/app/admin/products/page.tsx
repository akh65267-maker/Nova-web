"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts, useCreateProduct } from "@/features/catalog/use-products";
import { useCreateInventory, useInventoryList, useRestockInventory } from "@/features/inventory/use-inventory";
import { CATEGORIES } from "@/features/catalog/categories";
import { ErrorMessage } from "@/components/ui/error-message";
import { ErrorState } from "@/components/ui/error-state";
import { getApiErrorMessage } from "@/lib/api-error";

function NewProductDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [stock, setStock] = useState("0");

  const createProduct = useCreateProduct();
  const createInventory = useCreateInventory();

  const isPending = createProduct.isPending || createInventory.isPending;

  function reset() {
    setName("");
    setDescription("");
    setPrice("");
    setCategory(CATEGORIES[0]);
    setStock("0");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    createProduct.mutate(
      { name, description, price: Number(price), category },
      {
        onSuccess: ({ id }) => {
          createInventory.mutate(
            { productId: id, quantity: Number(stock) || 0 },
            {
              onSuccess: () => {
                toast.success(`${name} created`);
                reset();
                setOpen(false);
              },
            },
          );
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New product</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stock">Initial stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(value) => setCategory(value ?? CATEGORIES[0])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {createProduct.isError && <ErrorMessage>{getApiErrorMessage(createProduct.error)}</ErrorMessage>}
          {createInventory.isError && (
            <ErrorMessage>
              The product was created, but setting its stock failed: {getApiErrorMessage(createInventory.error)}{" "}
              Restock it from the list.
            </ErrorMessage>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RestockControl({ productId }: { productId: string }) {
  const [amount, setAmount] = useState("10");
  const restock = useRestockInventory();
  const createInventory = useCreateInventory();

  const isPending = restock.isPending || createInventory.isPending;

  function handleRestock() {
    const quantity = Number(amount) || 0;

    restock.mutate(
      { productId, quantity },
      {
        onSuccess: () => toast.success("Stock updated"),
        onError: (error) => {
          // No inventory record exists yet for this product (e.g. it was
          // created without initial stock) - restock only adds to an
          // existing record, so create one instead.
          if (error instanceof AxiosError && error.response?.status === 404) {
            createInventory.mutate(
              { productId, quantity },
              { onSuccess: () => toast.success("Stock created") },
            );
            return;
          }
          toast.error(getApiErrorMessage(error));
        },
      },
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min="1"
        step="1"
        className="h-8 w-20"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Button size="sm" variant="outline" disabled={isPending} onClick={handleRestock}>
        Restock
      </Button>
    </div>
  );
}

export default function AdminProductsPage() {
  const {
    data: productsResult,
    isLoading: isLoadingProducts,
    isError: isProductsError,
    error: productsError,
    refetch: refetchProducts,
  } = useProducts({ pageSize: 100 });
  const { data: inventory } = useInventoryList();

  const stockByProductId = new Map(inventory?.map((i) => [i.productId, i.quantityAvailable]));

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Manage products</h1>
        <NewProductDialog />
      </div>

      {isLoadingProducts ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isProductsError ? (
        <ErrorState error={productsError} onRetry={() => refetchProducts()} title="Couldn't load products" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsResult?.items.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>${product.price.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="min-w-16 text-right text-sm tabular-nums">
                      {stockByProductId.get(product.id) ?? 0}
                    </span>
                    <RestockControl productId={product.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
