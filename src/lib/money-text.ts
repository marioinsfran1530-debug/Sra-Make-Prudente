// Lê um valor em reais digitado à mão, no jeito brasileiro.
//
// Aceita "12", "12,5", "12.5", "R$ 12,50" e "1.234,56" (ponto como milhar).
// Devolve NaN quando o texto está vazio ou não é um número válido.
export function parseMoneyText(text: string): number {
  let value = text.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (value === "") return Number.NaN;

  if (value.includes(",")) {
    // "1.234,56": os pontos são milhares e a vírgula é o decimal.
    value = value.replace(/\./g, "").replace(",", ".");
  } else if ((value.match(/\./g) ?? []).length > 1 || /^[1-9]\d{0,2}\.\d{3}$/.test(value)) {
    // "1.234" ou "1.234.567" sem vírgula: ponto de milhar (ninguém digita 3 casas em dinheiro).
    value = value.replace(/\./g, "");
  }

  return /^(\d+\.?\d*|\.\d+)$/.test(value) ? Number(value) : Number.NaN;
}
