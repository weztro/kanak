"use client";

import * as React from "react";
import { CategoryWithCount, createCategoryAction, updateCategoryAction, deleteCategoryAction } from "@/server/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Tag,
  Pencil,
  Trash2,
  Lock,
  Layers,
  Sparkles,
  Package,
  Milk,
  Apple,
  Flame,
  Coffee,
  Check,
  Loader2,
} from "lucide-react";

interface CategoriesClientProps {
  initialCategories: CategoryWithCount[];
}

const POPULAR_ICONS = [
  { name: "tag", icon: Tag, label: "Tag" },
  { name: "package", icon: Package, label: "Package" },
  { name: "apple", icon: Apple, label: "Fruits/Veg" },
  { name: "milk", icon: Milk, label: "Dairy" },
  { name: "flame", icon: Flame, label: "Cooking" },
  { name: "coffee", icon: Coffee, label: "Beverages" },
  { name: "sparkles", icon: Sparkles, label: "Cleaning" },
  { name: "layers", icon: Layers, label: "General" },
];

export function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const [categories, setCategories] = React.useState<CategoryWithCount[]>(initialCategories);
  const [search, setSearch] = React.useState("");
  const [filterType, setFilterType] = React.useState<"all" | "system" | "custom">("all");

  // Create Modal
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newIcon, setNewIcon] = React.useState("tag");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Edit Modal
  const [editingCategory, setEditingCategory] = React.useState<CategoryWithCount | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editIcon, setEditIcon] = React.useState("tag");
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Delete State
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Sync state when props change
  React.useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const filteredCategories = React.useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        cat.name.toLowerCase().includes(search.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === "system") return cat.is_system;
      if (filterType === "custom") return !cat.is_system;
      return true;
    });
  }, [categories, search, filterType]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Category name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createCategoryAction({
        name: newName.trim(),
        description: newDesc.trim() || null,
        icon: newIcon,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to create category");
        setIsSubmitting(false);
        return;
      }

      toast.success(`Category "${newName.trim()}" created!`);
      setIsAddOpen(false);
      setNewName("");
      setNewDesc("");
      setNewIcon("tag");
    } catch {
      toast.error("Failed to create category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (cat: CategoryWithCount) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditDesc(cat.description || "");
    setEditIcon(cat.icon || "tag");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    if (!editingCategory.is_system && !editName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await updateCategoryAction(editingCategory.id, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        icon: editIcon,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update category");
        setIsUpdating(false);
        return;
      }

      toast.success("Category updated successfully!");
      setEditingCategory(null);
    } catch {
      toast.error("Failed to update category");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (cat: CategoryWithCount) => {
    if (cat.is_system) {
      toast.error("System default categories cannot be deleted");
      return;
    }

    if (cat.item_count > 0) {
      toast.error(`Cannot delete category while ${cat.item_count} items are assigned to it`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the "${cat.name}" category?`)) {
      return;
    }

    setDeletingId(cat.id);
    try {
      const res = await deleteCategoryAction(cat.id);
      if (!res.success) {
        toast.error(res.error || "Failed to delete category");
        setDeletingId(null);
        return;
      }

      toast.success(`Category "${cat.name}" deleted.`);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  };

  const renderIcon = (iconName?: string | null) => {
    const found = POPULAR_ICONS.find((i) => i.name === iconName);
    const Comp = found ? found.icon : Tag;
    return <Comp className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center space-x-2">
            <Tag className="h-5 w-5 text-neutral-500" />
            <span>Categories</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Organize household groceries and pantry supplies into structured categories.
          </p>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 text-xs h-9 shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Category
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-neutral-200/80 dark:bg-neutral-900 dark:border-neutral-800 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="pl-8 h-8 text-xs bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700"
          />
        </div>

        <div className="flex items-center space-x-1 border border-neutral-200 rounded-lg p-0.5 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs">
          <button
            onClick={() => setFilterType("all")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              filterType === "all"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400"
            }`}
          >
            All ({categories.length})
          </button>
          <button
            onClick={() => setFilterType("system")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              filterType === "system"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400"
            }`}
          >
            Default
          </button>
          <button
            onClick={() => setFilterType("custom")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              filterType === "custom"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400"
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <Tag className="h-8 w-8 text-neutral-300 mx-auto mb-2 dark:text-neutral-700" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              No categories found
            </p>
            <p className="text-xs text-neutral-400">
              Try adjusting your search or add a new custom category.
            </p>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <Card
              key={cat.id}
              className="border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-xs transition-shadow"
            >
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-8 w-8 rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 flex items-center justify-center shrink-0">
                      {renderIcon(cat.icon)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
                        {cat.name}
                      </h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                        {cat.description || "No description"}
                      </p>
                    </div>
                  </div>

                  {cat.is_system ? (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-neutral-400 border-neutral-200 dark:border-neutral-800">
                      <Lock className="h-2.5 w-2.5 mr-1" />
                      Default
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                      Custom
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-xs">
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    <strong className="text-neutral-900 dark:text-neutral-100 font-semibold">
                      {cat.item_count}
                    </strong>{" "}
                    items mapped
                  </span>

                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(cat)}
                      className="h-7 w-7 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                      title="Edit Category"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    {!cat.is_system && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === cat.id || cat.item_count > 0}
                        onClick={() => handleDelete(cat)}
                        className="h-7 w-7 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30"
                        title={
                          cat.item_count > 0
                            ? "Cannot delete: items are assigned to this category"
                            : "Delete Category"
                        }
                      >
                        {deletingId === cat.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create Custom Category</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a custom category for your bachelor flat groceries and household inventory.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Category Name *
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Snacks & Munchies, Party Supplies..."
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Description (Optional)
              </label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Short note about what items belong here"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Icon
              </label>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {POPULAR_ICONS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = newIcon === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setNewIcon(item.name)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-colors ${
                        isSelected
                          ? "border-neutral-900 bg-neutral-100 text-neutral-900 font-medium dark:border-neutral-100 dark:bg-neutral-800 dark:text-neutral-100 shadow-2xs"
                          : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-1" />
                      <span className="text-[10px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 text-xs bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Create Category
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center space-x-2">
              <Pencil className="h-4 w-4" />
              <span>Edit Category</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingCategory?.is_system
                ? "This is a system default category. You can customize its display icon."
                : "Update custom category name, description, and icon."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Category Name
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={editingCategory?.is_system}
                required
                className="h-8 text-xs disabled:opacity-60"
              />
              {editingCategory?.is_system && (
                <p className="text-[10px] text-neutral-400">
                  System default category names cannot be altered.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Description
              </label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                disabled={editingCategory?.is_system}
                className="h-8 text-xs disabled:opacity-60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Icon
              </label>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {POPULAR_ICONS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = editIcon === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setEditIcon(item.name)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-colors ${
                        isSelected
                          ? "border-neutral-900 bg-neutral-100 text-neutral-900 font-medium dark:border-neutral-100 dark:bg-neutral-800 dark:text-neutral-100 shadow-2xs"
                          : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-1" />
                      <span className="text-[10px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingCategory(null)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUpdating}
                className="h-8 text-xs bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
