import type { Metadata } from "next";
import Link from "next/link";

import PolicyPage from "@/app/components/policy-page";
import Storefronts from "@/app/components/storefronts";

export const metadata: Metadata = {
  title: "About | CANNAN",
  description:
    "Cannan curates meaningful pieces for every home and every tradition. For you and yours · Para ti y los tuyos.",
};

//  Cannan curates and brands its products rather than making them, so the
//  copy describes choosing pieces and never says "handmade" or "made by us".
export default function AboutUs() {
  return (
    <PolicyPage title="About Cannan">
      <p>
        <em>
          For you and yours · <span lang="es">Para ti y los tuyos</span>
        </em>
      </p>

      <h2>Our Story</h2>
      <p>
        Cannan began in California in 2022 with a simple belief: faith looks
        different in every home, and every home deserves a place to find what
        speaks to it.
      </p>
      <p>
        Our name comes from an ancient promise of a land where people could
        arrive, settle, and belong. We carry that spirit with us. Cannan is meant
        to be a place of welcome. Whatever you believe and however you pray, you
        can come as you are.
      </p>

      <h2>What We Do</h2>
      <p>
        We are curators. We look through the work of many makers to find pieces
        we believe are worth bringing into your home. We choose pieces that carry
        meaning, are made well, and are selected with the people who will keep
        them in mind. If something doesn’t feel right for our customers, it
        doesn’t make it onto our shelves.
      </p>
      <p>
        Every piece in our shop is chosen because we believe it has value to you,
        to your family, or to someone you love.
      </p>

      <h2>Our Collections</h2>
      <p>
        Each collection is curated with care for the community it serves, so
        every tradition is presented with the respect it deserves.
      </p>
      <p>
        <strong>Signature.</strong> Our founding collection, rooted in Catholic
        devotion: the saints, <span lang="es">la Virgen</span>, and the familiar
        images that have watched over homes for generations.
      </p>
      <p>
        <strong>Orishas.</strong> Pieces honoring the Orishas and the traditions
        that have carried their devotion across generations and across the
        Americas.
      </p>
      <p>
        <strong>Santa Muerte.</strong> Pieces for the devotees of{" "}
        <span lang="es">La Santa Muerte, La Niña Blanca</span>, offered with the
        same care as everything we carry.
      </p>

      <h2 lang="es">Muchos Caminos, Un Hogar</h2>
      <p>
        <strong>Many paths, one home</strong>
      </p>
      <p>
        Many of our customers come to us for one collection and discover the
        others along the way. We think that’s a good thing. You don’t have to
        share a belief to respect it, and you don’t have to belong to a tradition
        to learn about it.
      </p>
      <p>
        At Cannan, these traditions sit side by side. They are not mixed together
        and not compared. Each has its own space and its own dignity. Explore at
        your own pace and take home what speaks to you.
      </p>

      <h2>Our Promise</h2>
      <p>
        <strong>Chosen with intention.</strong> Every product in our shop was
        selected, not simply stocked.
      </p>
      <p>
        <strong>Respect for every tradition.</strong> Each collection keeps its
        own space, presented thoughtfully for the people who hold it sacred.
      </p>
      <p>
        <strong>Honest descriptions.</strong> What you see is what you’ll
        receive.
      </p>
      <p>
        <strong>Care in every order.</strong> Each order is packed with care,
        whether it’s for you or for someone you love.
      </p>
      <p>
        Read our <Link href="/shipping">Shipping</Link> and{" "}
        <Link href="/returns">Returns &amp; Refunds</Link> policies, or{" "}
        <Link href="/contact">get in touch</Link>.
      </p>

      <h2>Find us elsewhere</h2>
      <p>You can also shop Cannan on Amazon and Walmart.</p>
      <div className="mt-3">
        <Storefronts />
      </div>

      <hr />
      <p>
        Whether you’re looking for something for your own altar, a gift for
        someone close to you, or you’re simply curious about a tradition that
        isn’t your own: <span lang="es">bienvenidos</span>. You’re welcome here.
      </p>
      <p>
        <strong>
          Cannan. For you and yours.{" "}
          <span lang="es">Para ti y los tuyos.</span>
        </strong>
      </p>
    </PolicyPage>
  );
}
