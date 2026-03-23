import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Workout Tracker",
    short_name: "Workout",
    description: "Track your workouts and daily nutrition",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0D0D0D",
    theme_color: "#0D0D0D",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
