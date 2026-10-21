"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@taskmanager/ui/components/table";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import { ErrorMessage } from "@taskmanager/ui/components/error-message";
import { ErrorState } from "@taskmanager/ui/components/error-state";
import { getApiErrorMessage } from "@taskmanager/api/errors";
import type { CategoryDto } from "@taskmanager/api/catalog-api";
import { useCategories, useCreateCategory, useDeleteCategory, useRenameCategory } from "@taskmanager/api/use-categories";

function NewCategoryForm() {
  const [name, setName] = useState("");
  const create = useCreateCategory();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(name.trim(), {
      onSuccess: (category) => {
        toast.success(`${category.name} added`);
        setName("");
      },
      onError: (error) => toast.error(getApiErrorMessage(error)),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-category">New category</Label>
        <Input id="new-category" value={name} maxLength={100} required onChange={(e) => setName(e.target.value)} className="w-64" />
      </div>
      <Button type="submit" disabled={create.isPending || name.trim() === ""}>
        {create.isPending ? "Adding..." : "Add"}
      </Button>
    </form>
  );
}

function RenameDialog({ category }: { category: CategoryDto }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const rename = useRenameCategory();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    rename.mutate(
      { id: category.id, name: name.trim() },
      {
        onSuccess: () => {
          toast.success(`${category.name} renamed to ${name.trim()}`);
          setOpen(false);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setName(category.name);
          rename.reset();
        }
        setOpen(next);
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" aria-label={`Rename ${category.name}`}>Rename</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {category.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`rename-${category.id}`}>Name</Label>
            <Input id={`rename-${category.id}`} value={name} maxLength={100} required onChange={(e) => setName(e.target.value)} />
            <p className="text-xs text-muted-foreground">Its products move to the new name.</p>
          </div>
          {rename.isError && <ErrorMessage>{getApiErrorMessage(rename.error)}</ErrorMessage>}
          <DialogFooter>
            <Button type="submit" disabled={rename.isPending || name.trim() === "" || name.trim() === category.name}>
              {rename.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteControl({ category }: { category: CategoryDto }) {
  const remove = useDeleteCategory();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={remove.isPending}
      aria-label={`Delete ${category.name}`}
      onClick={() =>
        remove.mutate(category.id, {
          onSuccess: () => toast.success(`${category.name} deleted`),
          onError: (error) => toast.error(getApiErrorMessage(error)),
        })
      }
    >
      Delete
    </Button>
  );
}

export default function CategoriesPage() {
  const { data, isLoading, isError, refetch } = useCategories();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
      <NewCategoryForm />

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Products on sale</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="tabular-nums">{category.productCount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <RenameDialog category={category} />
                    <DeleteControl category={category} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="text-xs text-muted-foreground">A category can be deleted once it has no products, archived ones included.</p>
    </div>
  );
}
