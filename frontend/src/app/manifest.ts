import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Apex Intelligence",
    short_name: "Apex F1",
    description:
      "Virtual F1 race engineer for telemetry, strategy signals, and explainable mission-control workflows.",
    start_url: "/",
    display: "standalone",
    background_color: "#05070b",
    theme_color: "#05070b",
    icons: [
      {
        src: "/icon.png",
        sizes: "256x256",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "256x256",
        type: "image/png",
      },
    ],
  };
}
