"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Button } from "@taskmanager/ui/components/button";
import { Input } from "@taskmanager/ui/components/input";
import { Label } from "@taskmanager/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@taskmanager/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@taskmanager/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@taskmanager/ui/components/table";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import {
  useProducts,
  useCreateProduct,
  useDeleteProductImage,
  useSetProductArchived,
  useUpdateProduct,
  useUploadProductImage,
} from "@taskmanager/api/use-products";
import type { ProductDto } from "@taskmanager/api/catalog-api";
import { useCreateInventory, useInventoryList, useRestockInventory } from "@taskmanager/api/use-inventory";
import { useCategories } from "@taskmanager/api/use-categories";
import { ErrorMessage } from "@taskmanager/ui/components/error-message";
import { ErrorState } from "@taskmanager/ui/components/error-state";
import { getApiErrorMessage } from "@taskmanager/api/errors";

function NewProductDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("0");

  const { data: categoryList = [] } = useCategories();
  // Until one is chosen, the first category is the one the form shows.
  const selectedCategory = category || categoryList[0]?.name || "";
  const createProduct = useCreateProduct();
  const createInventory = useCreateInventory();

  const isPending = createProduct.isPending || createInventory.isPending;

  function reset() {
    setName("");
    setDescription("");
    setPrice("");
    setCategory("");
    setStock("0");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    createProduct.mutate(
      { name, description, price: Number(price), category: selectedCategory },
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
            <Select value={selectedCategory} onValueChange={(value) => setCategory(value ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryList.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
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

function EditProductDialog({ product }: { product: ProductDto }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(String(product.price));
  const [category, setCategory] = useState(product.category);

  const update = useUpdateProduct();
  // A product saved with a category outside the list (a typo) still shows its own value.
  const { data: categoryList = [] } = useCategories();
  const names = categoryList.map((c) => c.name);
  const categories = names.includes(category) ? names : [category, ...names];

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(product.name);
      setDescription(product.description);
      setPrice(String(product.price));
      setCategory(product.category);
      update.reset();
    }
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    update.mutate(
      { id: product.id, name, description, price: Number(price), category },
      {
        onSuccess: () => {
          toast.success(`${name} updated`);
          setOpen(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" aria-label={`Edit ${product.name}`}>Edit</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-name-${product.id}`}>Name</Label>
            <Input id={`edit-name-${product.id}`} required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-description-${product.id}`}>Description</Label>
            <Input id={`edit-description-${product.id}`} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-price-${product.id}`}>Price</Label>
              <Input id={`edit-price-${product.id}`} type="number" min="0" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(value) => setCategory(value ?? product.category)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {update.isError && <ErrorMessage>{getApiErrorMessage(update.error)}</ErrorMessage>}

          <DialogFooter>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveControl({ product }: { product: ProductDto }) {
  const setArchived = useSetProductArchived();
  const archiving = !product.isArchived;

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={setArchived.isPending}
      aria-label={`${archiving ? "Archive" : "Restore"} ${product.name}`}
      onClick={() =>
        setArchived.mutate(
          { id: product.id, archived: archiving },
          {
            onSuccess: () => toast.success(archiving ? `${product.name} archived: it is off sale` : `${product.name} is on sale again`),
            onError: (error) => toast.error(getApiErrorMessage(error)),
          },
        )
      }
    >
      {archiving ? "Archive" : "Restore"}
    </Button>
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

const PICTURE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PICTURE_MAX_BYTES = 2 * 1024 * 1024;

function PictureControl({ product }: { product: ProductDto }) {
  const upload = useUploadProductImage();
  const remove = useDeleteProductImage();
  const input = useRef<HTMLInputElement>(null);

  function handleChoose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // The server checks the bytes themselves; this only saves a round trip for the obvious mistakes.
    if (!PICTURE_TYPES.includes(file.type)) return void toast.error("Choose a JPEG, PNG or WebP picture.");
    if (file.size > PICTURE_MAX_BYTES) return void toast.error("A picture can be at most 2 MB.");

    upload.mutate(
      { id: product.id, file },
      { onSuccess: () => toast.success("Picture updated"), onError: (error) => toast.error(getApiErrorMessage(error)) },
    );
  }

  return (
    <div className="flex items-center gap-3">
      {product.imageUrl ? (
        <Dialog>
          <DialogTrigger
            render={
              <button type="button" className="size-10 shrink-0 cursor-zoom-in rounded-md focus-visible:ring-2 focus-visible:ring-ring">
                <Image src={product.imageUrl} alt={`Picture of ${product.name}`} width={40} height={40} unoptimized className="size-10 rounded-md object-cover ring-1 ring-foreground/10" />
              </button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{product.name}</DialogTitle>
            </DialogHeader>
            <Image src={product.imageUrl} alt={`Picture of ${product.name}`} width={640} height={640} unoptimized className="h-auto max-h-[70vh] w-full rounded-md object-contain" />
          </DialogContent>
        </Dialog>
      ) : (
        <span className="flex size-10 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">None</span>
      )}
      <input ref={input} type="file" accept={PICTURE_TYPES.join(",")} className="hidden" aria-label={`Choose a picture for ${product.name}`} onChange={handleChoose} />
      <Button size="sm" variant="outline" disabled={upload.isPending || remove.isPending} onClick={() => input.current?.click()}>
        {upload.isPending ? "Uploading..." : product.imageUrl ? "Replace" : "Upload"}
      </Button>
      {product.imageUrl && (
        <Button
          size="sm"
          variant="ghost"
          disabled={upload.isPending || remove.isPending}
          onClick={() =>
            remove.mutate(product.id, { onSuccess: () => toast.success("Picture removed"), onError: (error) => toast.error(getApiErrorMessage(error)) })
          }
        >
          Remove
        </Button>
      )}
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
  } = useProducts({ pageSize: 100, includeArchived: true });
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
        <ErrorState description={getApiErrorMessage(productsError, "Check your connection and try again.")} onRetry={() => refetchProducts()} title="Couldn't load products" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Picture</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsResult?.items.map((product) => (
              <TableRow key={product.id} className={product.isArchived ? "opacity-60" : undefined}>
                <TableCell className="font-medium">
                  {product.name}
                  {product.isArchived && <span className="ml-2 text-xs font-normal text-muted-foreground">Archived</span>}
                </TableCell>
                <TableCell>
                  <PictureControl product={product} />
                </TableCell>
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
                <TableCell>
                  <div className="flex items-center gap-1">
                    <EditProductDialog product={product} />
                    <ArchiveControl product={product} />
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
