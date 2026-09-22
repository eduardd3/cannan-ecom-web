import type { Metadata } from "next";
import Storefronts from "@/app/components/storefronts";
import Container from "@/app/components/container";

//  Homepage. Served at "/" directly — no redirect hop.
export const metadata: Metadata = {
  title: "Cannan | Official Online Store",
};

//  no HTML, body, or main -> outlined in Layout.tsx
//
//  Container is the outermost element, which is what lets flex-1 stretch it
//  into the space between header and footer; justify-center then centers the
//  block vertically in that space and items-center horizontally. The old
//  "grid flex justify-center" set display twice and left the outcome to
//  stylesheet order.
export default function Home() {
  return (
    <Container className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
      <div>
        <h1 className="text-xl font-bold">
          SHOP CANNAN - COMING SOON!
        </h1>
        <p className="mt-2">Something handmade is on the way.</p>
      </div>
      <Storefronts />
    </Container>
  );
}
