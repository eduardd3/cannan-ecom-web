import type { Metadata } from "next";

import Hero from "@/app/components/home/hero";
import Narrative from "@/app/components/home/narrative";
import Promises from "@/app/components/home/promises";

//  Homepage. Served at "/" directly — no redirect hop.
export const metadata: Metadata = {
  title: "Cannan | Official Online Store",
};

//  no HTML, body, or main -> outlined in Layout.tsx
//
//  Each section wraps its own content in Container rather than the page
//  wrapping them all: the narrative band's linen background runs full width.
export default function Home() {
  return (
    <>
      <Hero />
      <Narrative />
      <Promises />
    </>
  );
}
