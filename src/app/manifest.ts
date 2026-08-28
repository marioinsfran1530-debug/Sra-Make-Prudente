import type { MetadataRoute } from "next";

type LaunchAwareManifest = MetadataRoute.Manifest & {
  launch_handler?: {
    client_mode: ("focus-existing" | "auto")[];
  };
};

export default function manifest(): MetadataRoute.Manifest {
  const appManifest: LaunchAwareManifest = {
    name: "Sra Make Prudente | Catálogo",
    short_name: "Sra Make",
    description:
      "Catálogo da Sra Make Prudente — maquiagem, lash, nail e acessórios. Escolha pelo catálogo e confirme pelo WhatsApp.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF6FA",
    theme_color: "#E4127B",
    orientation: "portrait",
    launch_handler: {
      client_mode: ["focus-existing", "auto"],
    },
    icons: [
      { src: "/app-icon/192?v=3", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512?v=3", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/app-icon/maskable-192?v=3",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/app-icon/maskable-512?v=3",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return appManifest;
}
