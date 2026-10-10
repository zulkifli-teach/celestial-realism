import { createFileRoute } from "@tanstack/react-router";
import { SolarLab } from "@/components/SolarLab";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Lab Maya IPAS — Eksplorasi Sistem Tata Surya" },
    { name: "description", content: "Eksplorasi Bumi, Bulan, Matahari, dan delapan planet dalam simulasi 3D IPAS untuk kelas 5–6 SD." },
    { property: "og:title", content: "Lab Maya IPAS — Tata Surya 3D" },
    { property: "og:description", content: "Amati rotasi, revolusi, fase Bulan, dan orbit planet dalam laboratorium maya IPAS." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SolarLab,
});
