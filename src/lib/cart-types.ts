export type CartItem = {
  productId: string;
  variantId: string | null;
  variantName: string | null;
  name: string;
  brand: string;
  category?: string | null;
  sku: string | null;
  price: number; // preço unitário no momento em que foi adicionado (promoPrice se houver)
  imageUrl: string | null;
  qty: number;
};
