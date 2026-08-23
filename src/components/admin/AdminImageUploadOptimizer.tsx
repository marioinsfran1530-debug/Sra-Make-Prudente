"use client";

import { useEffect } from "react";

const MAX_SIDE = 1600;
const WEBP_QUALITY = 0.86;
const UPLOAD_PATH = "/api/admin/products/upload";

function isProductUpload(input: RequestInfo | URL, init?: RequestInit) {
  if ((init?.method ?? "GET").toUpperCase() !== "POST") return false;

  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname === UPLOAD_PATH;
  } catch {
    return false;
  }
}

async function optimizeImage(file: File) {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY)
    );

    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "produto";
    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

async function optimizeFormData(body: FormData) {
  const file = body.get("file");
  if (!(file instanceof File)) return body;

  const optimized = await optimizeImage(file);
  if (optimized === file) return body;

  const next = new FormData();
  body.forEach((value, key) => {
    if (key !== "file") next.append(key, value);
  });
  next.append("file", optimized);
  return next;
}

/**
 * Normaliza imagens no navegador antes de enviá-las para a Function.
 * Isso reduz PNG/JPG grandes para WebP e evita ultrapassar o limite de corpo
 * da requisição da hospedagem antes mesmo de a rota de upload ser executada.
 */
export function AdminImageUploadOptimizer() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!isProductUpload(input, init) || !(init?.body instanceof FormData)) {
        return originalFetch(input, init);
      }

      const optimizedBody = await optimizeFormData(init.body);
      const nextInit: RequestInit = { ...init, body: optimizedBody };

      let response = await originalFetch(input, nextInit);

      // Uma repetição curta cobre falhas transitórias de rede/Storage sem
      // obrigar a pessoa a cadastrar o produto novamente.
      if (!response.ok && response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        response = await originalFetch(input, nextInit);
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
