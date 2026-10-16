// SERVER component: decides whether to render at all, with no client JS when hidden.
//
// Mounted in (storefront)/layout.tsx. The static-rendering cost of calling
// auth() there is already paid: SiteHeader calls it too, so every storefront
// page renders per request anyway. Moving the banner to a static layout would
// need the client-side useSession() approach instead.

import { auth } from "@/lib/auth-actions";
import { ResendButton } from "./resend-button";

export async function VerifyBanner() {
  const session = await auth();
  if (!session?.user || session.user.emailVerified) return null;

  // Not dismissible for now. Kept visually quiet.
  return (
    <div className="border-b border-hairline bg-linen px-4 py-2 text-center text-sm text-charcoal">
      Please confirm your email address. <ResendButton />
    </div>
  );
}
