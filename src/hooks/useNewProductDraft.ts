"use client";

import { useEffect, useRef } from "react";

type VariantDraft = {
  id?: string;
  name: string;
  stockQty: number;
};

export type NewProductDraftValues = {
  name: string;
  brand: string;
  sku: string;
  description: string;
  price: string;
  promoPrice: string;
  costPrice: string;
  stockQty: string;
  featured: boolean;
  isNew: boolean;
  bestSeller: boolean;
  active: boolean;
  categoryId: string;
  categoryIds: string[];
  subcategoryId: string;
  variants: VariantDraft[];
};

type StoredDraft = {
  version: 1;
  updatedAt: number;
  path: "/admin/produtos/novo";
  values: NewProductDraftValues;
  hadUnsavedImages: boolean;
};

type ResumeState = {
  path: "/admin/produtos/novo";
  updatedAt: number;
};

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
export const NEW_PRODUCT_DRAFT_KEY = "sra-make:admin:new-product-draft:v1";
export const ADMIN_RESUME_KEY = "sra-make:admin:resume:v1";

function isFresh(timestamp: number) {
  return Number.isFinite(timestamp) && Date.now() - timestamp <= DRAFT_TTL_MS;
}

function writeDraft(values: NewProductDraftValues, hadUnsavedImages: boolean) {
  const updatedAt = Date.now();
  const draft: StoredDraft = {
    version: 1,
    updatedAt,
    path: "/admin/produtos/novo",
    values,
    hadUnsavedImages,
  };
  const resume: ResumeState = {
    path: "/admin/produtos/novo",
    updatedAt,
  };
  localStorage.setItem(NEW_PRODUCT_DRAFT_KEY, JSON.stringify(draft));
  localStorage.setItem(ADMIN_RESUME_KEY, JSON.stringify(resume));
}

export function clearNewProductDraft() {
  try {
    localStorage.removeItem(NEW_PRODUCT_DRAFT_KEY);
    localStorage.removeItem(ADMIN_RESUME_KEY);
  } catch {
    // Storage indisponível não deve bloquear o cadastro.
  }
}

export function useNewProductDraft({
  enabled,
  dirty,
  values,
  hadUnsavedImages,
  onRestore,
}: {
  enabled: boolean;
  dirty: boolean;
  values: NewProductDraftValues;
  hadUnsavedImages: boolean;
  onRestore: (values: NewProductDraftValues, hadUnsavedImages: boolean) => void;
}) {
  const hydrated = useRef(false);
  const latestValues = useRef(values);
  const latestHadUnsavedImages = useRef(hadUnsavedImages);
  const latestDirty = useRef(dirty);
  const onRestoreRef = useRef(onRestore);

  useEffect(() => {
    latestValues.current = values;
    latestHadUnsavedImages.current = hadUnsavedImages;
    latestDirty.current = dirty;
  }, [values, hadUnsavedImages, dirty]);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    if (!enabled) {
      hydrated.current = true;
      return;
    }

    try {
      const raw = localStorage.getItem(NEW_PRODUCT_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<StoredDraft>;
      if (
        draft.version !== 1 ||
        draft.path !== "/admin/produtos/novo" ||
        !draft.values ||
        typeof draft.updatedAt !== "number" ||
        !isFresh(draft.updatedAt)
      ) {
        clearNewProductDraft();
        return;
      }
      onRestoreRef.current(draft.values, Boolean(draft.hadUnsavedImages));
    } catch {
      clearNewProductDraft();
    } finally {
      hydrated.current = true;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !hydrated.current || !dirty) return;
    try {
      writeDraft(values, hadUnsavedImages);
    } catch {
      // Falha de storage não pode impedir o preenchimento manual.
    }
  }, [enabled, dirty, values, hadUnsavedImages]);

  useEffect(() => {
    if (!enabled) return;

    const persistBeforeBackground = () => {
      if (!latestDirty.current) return;
      try {
        writeDraft(latestValues.current, latestHadUnsavedImages.current);
      } catch {
        // O Android pode suspender a aplicação imediatamente; falha silenciosa é preferível.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistBeforeBackground();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", persistBeforeBackground);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", persistBeforeBackground);
    };
  }, [enabled]);

  return { clearDraft: clearNewProductDraft };
}
