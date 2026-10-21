"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { X } from "lucide-react";
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
  useAddGalleryImage,
  useRemoveGalleryImage,
  useDiscount,
  useSetDiscount,
  useClearDiscount,
} from "@taskmanager/api/use-products";
import type { DiscountDto, ProductAttribute, ProductDto } from "@taskmanager/api/catalog-api";
import { useCreateInventory, useInventoryList, useRestockInventory } from "@taskmanager/api/use-inventory";
import { useBrands } from "@taskmanager/api/use-brands";
import { useCategories } from "@taskmanager/api/use-categories";
import { ErrorMessage } from "@taskmanager/ui/components/error-message";
import { ErrorState } from "@taskmanager/ui/components/error-state";
import { getApiErrorMessage } from "@taskmanager/api/errors";

// Free text, with the brands already in use offered as suggestions.
function BrandField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const { data: brands = [] } = useBrands();

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Brand (optional)</Label>
      <Input id={id} list={`${id}-brands`} maxLength={100} value={value} onChange={(e) => onChange(e.target.value)} />
      <datalist id={`${id}-brands`}>
        {brands.map((b) => (
          <option key={b.name} value={b.name} />
        ))}
      </datalist>
    </div>
  );
}

// Rows of name and value; blank rows are dropped by the server.
function AttributesField({
  value,
  onChange,
}: {
  value: ProductAttribute[];
  onChange: (value: ProductAttribute[]) => void;
}) {
  const setRow = (index: number, row: ProductAttribute) => onChange(value.map((r, i) => (i === index ? row : r)));

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Attributes (optional)</Label>
      {value.map((row, index) => (
        <div key={index} className="flex gap-2">
          <Input
            aria-label={`Attribute ${index + 1} name`}
            placeholder="Colour"
            maxLength={50}
            value={row.name}
            onChange={(e) => setRow(index, { ...row, name: e.target.value })}
          />
          <Input
            aria-label={`Attribute ${index + 1} value`}
            placeholder="Black"
            maxLength={200}
            value={row.value}
            onChange={(e) => setRow(index, { ...row, value: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label={`Remove attribute ${index + 1}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      {value.length < 20 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => onChange([...value, { name: "", value: "" }])}
        >
          Add attribute
        </Button>
      )}
    </div>
  );
}

// The extra pictures of a product, beside its main one. Each change is saved at once.
function GalleryField({ product }: { product: ProductDto }) {
  const add = useAddGalleryImage();
  const remove = useRemoveGalleryImage();
  const input = useRef<HTMLInputElement>(null);
  const busy = add.isPending || remove.isPending;

  function handleChoose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!PICTURE_TYPES.includes(file.type)) return void toast.error("Choose a JPEG, PNG or WebP picture.");
    if (file.size > PICTURE_MAX_BYTES) return void toast.error("A picture can be at most 2 MB.");

    add.mutate(
      { id: product.id, file },
      { onSuccess: () => toast.success("Picture added"), onError: (error) => toast.error(getApiErrorMessage(error)) },
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Gallery (optional)</Label>
      <div className="flex flex-wrap items-center gap-2">
        {product.gallery.map((url, index) => (
          <div key={url} className="relative size-14 shrink-0">
            <Image src={url} alt={`Gallery picture ${index + 1} of ${product.name}`} width={56} height={56} unoptimized className="size-14 rounded-md object-cover ring-1 ring-foreground/10" />
            <button
              type="button"
              disabled={busy}
              aria-label={`Remove gallery picture ${index + 1}`}
              className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-background ring-1 ring-foreground/20 hover:bg-muted"
              onClick={() =>
                remove.mutate(
                  { id: product.id, version: url.slice(url.lastIndexOf("/") + 1) },
                  { onSuccess: () => toast.success("Picture removed"), onError: (error) => toast.error(getApiErrorMessage(error)) },
                )
              }
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {product.gallery.length < 8 && (
          <>
            <input ref={input} type="file" accept={PICTURE_TYPES.join(",")} className="hidden" aria-label={`Add a gallery picture for ${product.name}`} onChange={handleChoose} />
            <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={busy} onClick={() => input.current?.click()}>
              {add.isPending ? "Uploading..." : "Add picture"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// The input wants local time without a zone; the API wants UTC.
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

// One discount per product, as a percent or an amount, for as long as its dates allow. Saved at once.
function DiscountField({ product }: { product: ProductDto }) {
  const { data: discount, isLoading } = useDiscount(product.id);

  return (
    <div className="col-span-2 flex flex-col gap-1.5">
      <Label>Discount (optional)</Label>
      {isLoading ? <Skeleton className="h-9 w-full" /> : <DiscountForm key={JSON.stringify(discount ?? null)} product={product} discount={discount ?? null} />}
    </div>
  );
}

function DiscountForm({ product, discount }: { product: ProductDto; discount: DiscountDto | null }) {
  const save = useSetDiscount(product.id);
  const clear = useClearDiscount(product.id);
  const [kind, setKind] = useState<DiscountDto["kind"]>(discount?.kind ?? "Percent");
  const [value, setValue] = useState(discount ? String(discount.value) : "");
  const [startsAt, setStartsAt] = useState(toLocalInput(discount?.startsAtUtc ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(discount?.endsAtUtc ?? null));
  const busy = save.isPending || clear.isPending;
  const fail = (error: unknown) => toast.error(getApiErrorMessage(error));

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[8rem_1fr] gap-2">
        <select
          aria-label="Discount type"
          value={kind}
          onChange={(e) => setKind(e.target.value as DiscountDto["kind"])}
          className="h-9 rounded-lg border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="Percent">Percent off</option>
          <option value="Fixed">Amount off</option>
        </select>
        <Input aria-label="Discount value" type="number" min="0" step="0.01" placeholder={kind === "Percent" ? "e.g. 15" : "e.g. 10.00"} value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Starts (blank: now)</span>
          <Input aria-label="Discount starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Ends (blank: never)</span>
          <Input aria-label="Discount ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || value === ""}
          onClick={() =>
            save.mutate(
              { kind, value: Number(value), startsAtUtc: fromLocalInput(startsAt), endsAtUtc: fromLocalInput(endsAt) },
              { onSuccess: () => toast.success("Discount saved"), onError: fail },
            )
          }
        >
          {save.isPending ? "Saving..." : discount ? "Update discount" : "Set discount"}
        </Button>
        {discount && (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => clear.mutate(undefined, { onSuccess: () => toast.success("Discount removed"), onError: fail })}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

function NewProductDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
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
    setBrand("");
    setAttributes([]);
    setStock("0");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    createProduct.mutate(
      { name, description, price: Number(price), category: selectedCategory, brand, attributes },
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

          <BrandField id="brand" value={brand} onChange={setBrand} />
          <AttributesField value={attributes} onChange={setAttributes} />

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
  const [price, setPrice] = useState(String(product.listPrice));
  const [category, setCategory] = useState(product.category);
  const [brand, setBrand] = useState(product.brand ?? "");
  const [attributes, setAttributes] = useState<ProductAttribute[]>(product.attributes);

  const update = useUpdateProduct();
  // A product saved with a category outside the list (a typo) still shows its own value.
  const { data: categoryList = [] } = useCategories();
  const names = categoryList.map((c) => c.name);
  const categories = names.includes(category) ? names : [category, ...names];

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(product.name);
      setDescription(product.description);
      setPrice(String(product.listPrice));
      setCategory(product.category);
      setBrand(product.brand ?? "");
      setAttributes(product.attributes);
      update.reset();
    }
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    update.mutate(
      { id: product.id, name, description, price: Number(price), category, brand, attributes },
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

            <BrandField id={`edit-brand-${product.id}`} value={brand} onChange={setBrand} />
            <AttributesField value={attributes} onChange={setAttributes} />
            <GalleryField product={product} />
            <DiscountField product={product} />

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
    <div className="flex w-max items-center gap-3">
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
      <Button size="sm" variant="outline" className="shrink-0" disabled={upload.isPending || remove.isPending} onClick={() => input.current?.click()}>
        {upload.isPending ? "Uploading..." : product.imageUrl ? "Replace" : "Upload"}
      </Button>
      {product.imageUrl && (
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0"
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
              <TableHead className="sticky right-0 border-l bg-background">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsResult?.items.map((product) => (
              <TableRow key={product.id} className={product.isArchived ? "opacity-60" : undefined}>
                <TableCell className="font-medium">
                  {product.name}
                  {product.brand && <span className="ml-2 text-xs font-normal text-muted-foreground">{product.brand}</span>}
                  {product.isArchived && <span className="ml-2 text-xs font-normal text-muted-foreground">Archived</span>}
                </TableCell>
                <TableCell>
                  <PictureControl product={product} />
                </TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>
                  ${product.price.toFixed(2)}
                  {product.discountPercent !== null && (
                    <span className="ml-2 text-xs text-muted-foreground line-through">${product.listPrice.toFixed(2)}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="min-w-16 text-right text-sm tabular-nums">
                      {stockByProductId.get(product.id) ?? 0}
                    </span>
                    <RestockControl productId={product.id} />
                  </div>
                </TableCell>
                <TableCell className="sticky right-0 border-l bg-background">
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
