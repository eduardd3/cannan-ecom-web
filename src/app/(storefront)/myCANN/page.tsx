import type { Metadata } from "next";
import Link from 'next/link';
import Container from "@/app/components/container";
import { isSignupEnabled } from "@/lib/flags";

//  Site chrome comes from the (storefront) group layout — this segment used to
//  carry a duplicate copy of it.
export const metadata: Metadata = {
    title: "myCANN | Cannan",
    description: "Sign in to your Cannan account",
};

//  The previous version put "content-center place-items-center" on a plain
//  block div — both are flex/grid alignment properties, so neither did
//  anything and this splash sat in the top-left. Container as the outermost
//  element + flex-1 is what actually centers it between header and footer.
export default function MyCANNPage () {
    return (
        <Container className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
            <div className="flex flex-row gap-10 rounded-md bg-[#16191E] px-12 py-5 text-white">
                <Link href="/id/signin">Sign in</Link>
                {isSignupEnabled() && <Link href="/id/signup">Join</Link>}
            </div>
            <p className="underline">
                <Link href="/about-myCANN">Learn more about myCANN</Link>
            </p>
        </Container>
    );
}