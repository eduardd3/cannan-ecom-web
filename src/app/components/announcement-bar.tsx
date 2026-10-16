//  Site-wide notice above the header. It scrolls away with the page; only the
//  header below it is sticky. Shipping is free on every order at launch, so no
//  "over $X" threshold here.
export default function AnnouncementBar() {
  return (
    <div className="shrink-0 bg-charcoal px-4 py-2 text-center text-caption text-gallery-white">
      <p>
        Free shipping on every order · <span lang="es">Envíos a todo el país</span>
      </p>
    </div>
  );
}
