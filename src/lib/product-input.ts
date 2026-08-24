export type ProductInput = {
  name: string;
  brand: string;
  sku: string | null;
  description: string | null;
  price: number;
  promoPrice: number | null;
  stockQty: number;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidGtin(value: string) {
  const digits = onlyDigits(value);
  if (![8, 12, 13, 14].includes(digits.length)) return false;

  const numbers = digits.split("").map(Number);
  const checkDigit = numbers.pop();
  if (checkDigit === undefined) return false;

  let sum = 0;
  for (let i = numbers.length - 1, position = 0; i >= 0; i--, position++) {
    sum += numbers[i] * (position % 2 === 0 ? 3 : 1);
  }

  return (10 - (sum % 10)) % 10 === checkDigit;
}

function isPureGtinCandidate(value: string) {
  const compact = value.replace(/\s/g, "");
  return /^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(compact);
}

export function validateProductInput(body: Record<string, unknown>, partial = false) {
  const errors: string[] = [];

  const rawName = body.name;
  const rawBrand = body.brand;
  const rawSku = body.sku;
  const rawDescription = body.description;
  const rawPrice = body.price;
  const rawPromoPrice = body.promoPrice;
  const rawStockQty = body.stockQty;

  const name = typeof rawName === "string" ? rawName.trim() : "";
  const brand = typeof rawBrand === "string" ? rawBrand.trim() : "";
  const sku = typeof rawSku === "string" && rawSku.trim() ? rawSku.trim() : null;
  const description =
    typeof rawDescription === "string" && rawDescription.trim()
      ? rawDescription.trim()
      : null;
  const price = rawPrice === undefined ? NaN : Number(rawPrice);
  const promoPrice =
    rawPromoPrice === undefined || rawPromoPrice === null || rawPromoPrice === ""
      ? null
      : Number(rawPromoPrice);
  const stockQty = rawStockQty === undefined ? NaN : Number(rawStockQty);

  if ((!partial || rawName !== undefined) && name.length < 3) {
    errors.push("Informe um nome de produto com pelo menos 3 caracteres.");
  }

  if ((!partial || rawBrand !== undefined) && brand.length < 2) {
    errors.push("Informe a marca do produto.");
  }

  if ((!partial || rawPrice !== undefined) && (!Number.isFinite(price) || price <= 0)) {
    errors.push("O preço deve ser maior que zero.");
  }

  if (rawPromoPrice !== undefined && promoPrice !== null) {
    if (!Number.isFinite(promoPrice) || promoPrice <= 0) {
      errors.push("O preço promocional deve ser maior que zero.");
    } else if (Number.isFinite(price) && promoPrice >= price) {
      errors.push("O preço promocional deve ser menor que o preço normal.");
    }
  }

  if ((!partial || rawStockQty !== undefined) && (!Number.isInteger(stockQty) || stockQty < 0)) {
    errors.push("O estoque deve ser um número inteiro igual ou maior que zero.");
  }

  if (sku && isPureGtinCandidate(sku) && !isValidGtin(sku)) {
    errors.push("O EAN/GTIN informado possui dígito verificador inválido.");
  }

  return {
    ok: errors.length === 0,
    errors,
    data: {
      name,
      brand,
      sku,
      description,
      price,
      promoPrice,
      stockQty,
    } satisfies ProductInput,
  };
}
