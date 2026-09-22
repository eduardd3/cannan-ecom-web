import FormHeader from "@/app/components/form-header";

//  Nested layout: root layout (app/layout.tsx) already renders <html>/<body>,
//  so this only wraps the identity segment — no site header/footer here.
//  min-h-dvh anchors the split to the viewport instead of relying on a
//  percentage height chain through <html>/<body>/<main>.
export default function IdentityLayout({
  children, //  children -> content of the page
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      {/* Brand panel: grid items stretch by default, so this fills the side */}
      <aside className="flex flex-col bg-[#16191E]">
        <FormHeader />
      </aside>

      {/* Form column */}
      <div className="flex items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}
