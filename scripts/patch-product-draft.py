from pathlib import Path

path = Path("src/components/admin/ProductForm.tsx")
text = path.read_text(encoding="utf-8")

replacements = []

old_import = '''import { Sparkles } from "lucide-react";\nimport { ProductImageEditor } from "@/components/admin/ProductImageEditor";'''
new_import = '''import { Sparkles } from "lucide-react";\nimport { ProductImageEditor } from "@/components/admin/ProductImageEditor";\nimport { useNewProductDraft } from "@/hooks/useNewProductDraft";'''
replacements.append((old_import, new_import, "import do rascunho"))

old_hook_anchor = '''  const canGenerateDescription = Boolean(name.trim() && brand.trim() && categoryId);\n\n  useEffect(() => {'''
new_hook_anchor = '''  const canGenerateDescription = Boolean(name.trim() && brand.trim() && categoryId);\n\n  const { clearDraft } = useNewProductDraft({\n    enabled: !isEdit,\n    dirty,\n    values: {\n      name,\n      brand,\n      sku,\n      description,\n      price,\n      promoPrice,\n      costPrice,\n      stockQty,\n      featured,\n      isNew,\n      bestSeller,\n      active,\n      categoryId,\n      categoryIds,\n      subcategoryId,\n      variants,\n    },\n    hadUnsavedImages: newImages.length > 0,\n    onRestore: (draft, hadUnsavedImages) => {\n      setName(draft.name);\n      setBrand(draft.brand);\n      setSku(draft.sku);\n      setDescription(draft.description);\n      setPrice(draft.price);\n      setPromoPrice(draft.promoPrice);\n      setCostPrice(draft.costPrice);\n      setStockQty(draft.stockQty);\n      setFeatured(draft.featured);\n      setIsNew(draft.isNew);\n      setBestSeller(draft.bestSeller);\n      setActive(draft.active);\n      setCategoryId(draft.categoryId);\n      setCategoryIds(draft.categoryIds);\n      setSubcategoryId(draft.subcategoryId);\n      setVariants(draft.variants);\n      clearAiDescriptionTracking();\n      setError(null);\n      setDirty(true);\n      setSuccess(\n        hadUnsavedImages\n          ? "Rascunho recuperado automaticamente. Os dados foram preservados; selecione novamente as fotos que ainda não tinham sido salvas."\n          : "Rascunho recuperado automaticamente. Você pode continuar de onde parou."\n      );\n    },\n  });\n\n  useEffect(() => {'''
replacements.append((old_hook_anchor, new_hook_anchor, "hook de rascunho"))

old_upload_redirect = '''            router.replace(`/admin/produtos/${productId}`);\n            return;'''
new_upload_redirect = '''            clearDraft();\n            setDirty(false);\n            router.replace(`/admin/produtos/${productId}`);\n            return;'''
replacements.append((old_upload_redirect, new_upload_redirect, "limpeza após criação com falha de foto"))

old_new_success = '''      try {\n        sessionStorage.setItem(\n          PRODUCT_SAVE_MESSAGE_KEY,'''
new_new_success = '''      clearDraft();\n      try {\n        sessionStorage.setItem(\n          PRODUCT_SAVE_MESSAGE_KEY,'''
replacements.append((old_new_success, new_new_success, "limpeza após criação"))

old_guard = '''      <UnsavedChangesGuard when={dirty && !saving} onDiscard={() => setDirty(false)} />'''
new_guard = '''      <UnsavedChangesGuard\n        when={dirty && !saving}\n        onDiscard={() => {\n          if (!isEdit) clearDraft();\n          setDirty(false);\n        }}\n      />'''
replacements.append((old_guard, new_guard, "descarte explícito do rascunho"))

for old, new, label in replacements:
    if new in text:
        continue
    if old not in text:
        raise SystemExit(f"Marcador não encontrado: {label}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
