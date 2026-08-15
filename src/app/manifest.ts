import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sra Make Prudente | Catálogo",
    short_name: "Sra Make",
    description:
      "Catálogo da Sra Make Prudente — maquiagem, lash, nail e acessórios. Escolha pelo catálogo e confirme pelo WhatsApp.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF6FA",
    theme_color: "#E4127B",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
