import Image from "next/image";
import Link from "next/link";

type OrderThumbProps = {
    url: string | null;
    alt: string;
    //  The product page, when the item's name beside it links there too.
    href?: string | null;
};

//  56px item image on the orders list and order page. A missing image is a
//  plain linen square of the same size, so rows stay aligned.
export default function OrderThumb({ url, alt, href }: OrderThumbProps) {
    const boxClass = `relative size-14 shrink-0 overflow-hidden ${url ? "bg-white" : "bg-linen"}`;
    const image = url && <Image src={url} alt={alt} fill sizes="56px" className="object-contain" />;

    //  The name links too, so the image link is skipped by the keyboard and
    //  screen readers instead of being read twice.
    return href ? (
        <Link href={href} tabIndex={-1} aria-hidden="true" className={boxClass}>
            {image}
        </Link>
    ) : (
        <div className={boxClass}>{image}</div>
    );
}
