import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const products = await getProducts({
    categorySlug: searchParams.get("category") ?? undefined,
    subcategorySlug: searchParams.get("subcategory") ?? undefined,
    brand: searchParams.get("brand") ?? undefined,
    search: searchParams.get("q") ?? undefined,
    featured: searchParams.get("featured") === "true",
    isNew: searchParams.get("new") === "true",
    bestSeller: searchParams.get("bestseller") === "true",
    maxPrice: searchParams.get("maxPrice")
      ? Number(searchParams.get("maxPrice"))
      : undefined,
  });

  return NextResponse.json({ products });
}
