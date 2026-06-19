import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  createProduct,
  ImageUploadError,
  updateProduct,
  uploadProductImage,
} from "../services/dashboard_service";
import type { Product } from "../types/dashboard_types";
import { productFormSchema, type ProductFormInput } from "../schemas/product_schema";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_MB = 5;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductFormDialogProps {
  open: boolean;
  teamId: string;
  product?: Product;
  onClose: () => void;
  onSuccess: (product: Product) => void;
}

// ── Image Preview ─────────────────────────────────────────────────────────────

function ImagePicker({
  existingUrl,
  onFile,
  onClear,
  error,
}: {
  existingUrl: string | null;
  onFile: (f: File) => void;
  onClear: () => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(existingUrl);
  const [prevUrl, setPrevUrl] = useState<string | null>(existingUrl);

  if (existingUrl !== prevUrl) {
    setPrevUrl(existingUrl);
    setPreview(existingUrl);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onFile(file);
  };

  const handleClear = () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  };

  return (
    <div className="space-y-1.5">
      <Label>Image <span className="text-zinc-500 font-normal">(optional)</span></Label>
      {preview ? (
        <div className="relative w-full overflow-hidden rounded-xl border border-zinc-700">
          <img
            src={preview}
            alt="preview"
            className="h-44 w-full object-cover"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 backdrop-blur-sm transition hover:bg-red-500/80 hover:text-white cursor-pointer"
            aria-label="Remove image"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-800/40 px-4 py-8 text-zinc-500 transition hover:border-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-300"
        >
          <Upload className="size-5" />
          <span className="text-xs">Click to upload image</span>
          <span className="text-[10px] text-zinc-600">JPEG · PNG · WebP · GIF · max {MAX_MB} MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={handleChange}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Main Dialog ───────────────────────────────────────────────────────────────


export function ProductFormDialog({
  open,
  teamId,
  product,
  onClose,
  onSuccess,
}: ProductFormDialogProps) {
  const isEdit = Boolean(product);

  // Form hook
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: product?.title ?? "",
      description: product?.description ?? "",
    },
  });

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  /** null = user explicitly cleared the image */
  const [imageClearedExplicitly, setImageClearedExplicitly] = useState(false);

  const [imageError, setImageError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevProduct, setPrevProduct] = useState(product);

  if (open !== prevOpen || product?.id !== prevProduct?.id) {
    setPrevOpen(open);
    setPrevProduct(product);
    if (open) {
      reset({
        title: product?.title ?? "",
        description: product?.description ?? "",
      });
      setImageFile(null);
      setImageClearedExplicitly(false);
      setImageError(null);
      setApiError(null);
    }
  }

  const validateImage = (file: File): boolean => {
    if (file.size > MAX_BYTES) {
      setImageError(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${MAX_MB} MB.`);
      return false;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError("Unsupported format. Allowed: JPEG, PNG, WebP, GIF.");
      return false;
    }
    setImageError(null);
    return true;
  };

  const handleFile = (file: File) => {
    if (validateImage(file)) {
      setImageFile(file);
      setImageClearedExplicitly(false);
    }
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImageClearedExplicitly(true);
    setImageError(null);
  };

  const onSubmitForm = async (data: ProductFormInput) => {
    if (imageFile && !validateImage(imageFile)) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      let imageUrl: string | null | undefined;

      const trimmedTitle = data.title.trim();
      const trimmedDescription = data.description?.trim() || null;

      if (isEdit && product) {
        // ── Edit flow ──────────────────────────────────────────────────────
        // 1. Upload new image if provided
        if (imageFile) {
          imageUrl = await uploadProductImage(teamId, product.id, imageFile);
        } else if (imageClearedExplicitly) {
          imageUrl = null; // signal edge function to delete old file
        }
        // else: imageUrl stays undefined → don't touch the image column

        const payload: Record<string, unknown> = {};
        if (trimmedTitle !== product.title) payload.title = trimmedTitle;
        if (trimmedDescription !== (product.description ?? null))
          payload.description = trimmedDescription;
        if (imageUrl !== undefined) payload.image = imageUrl;

        const updated = await updateProduct(product.id, payload);
        onSuccess(updated);
      } else {
        // ── Create flow ────────────────────────────────────────────────────
        // 1. Create the product first to get the ID
        const created = await createProduct({
          title: trimmedTitle,
          description: trimmedDescription || undefined,
        });

        // 2. Upload image using the new product's ID
        if (imageFile) {
          const uploadedUrl = await uploadProductImage(teamId, created.id, imageFile);
          // 3. Patch the image URL onto the product
          const withImage = await updateProduct(created.id, { image: uploadedUrl });
          onSuccess(withImage);
        } else {
          onSuccess(created);
        }
      }
    } catch (err) {
      if (err instanceof ImageUploadError) {
        setImageError(err.message);
      } else {
        setApiError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const existingImageUrl =
    !imageClearedExplicitly && !imageFile ? (product?.image ?? null) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <ImageIcon className="size-4 text-emerald-400" />
            {isEdit ? "Edit Product" : "New Product"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitForm)} className="mt-2 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="product-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="product-title"
              placeholder="e.g. Premium Headphones"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="product-description">Description</Label>
            <Textarea
              id="product-description"
              placeholder="Short product description…"
              {...register("description")}
              rows={3}
              className="resize-none"
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Image */}
          <ImagePicker
            existingUrl={existingImageUrl}
            onFile={handleFile}
            onClear={handleClearImage}
            error={imageError ?? undefined}
          />

          {/* API error */}
          {apiError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {apiError}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer text-zinc-400 hover:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              id="product-form-submit"
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Product"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
