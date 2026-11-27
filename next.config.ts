import type { NextConfig } from "next";

//  Product images in S3 are served through CloudFront (src/lib/storage).
//  Allow exactly that host for next/image; unset means seed images only.
const imageCdn = process.env.IMAGE_CDN_URL ? new URL(process.env.IMAGE_CDN_URL) : null;

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: imageCdn
      ? [{ protocol: "https", hostname: imageCdn.hostname, port: "", pathname: "/**", search: "" }]
      : [],
    //  Vercel bills image cache writes by size, so cap widths at what the
    //  layouts need: the product gallery peaks around 1200px (tablet at 50vw,
    //  3x phones at 100vw). The defaults go up to 3840px.
    deviceSizes: [640, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256, 384],
    //  One quality and one format, so each width is cached once.
    qualities: [75],
    formats: ["image/webp"],
    //  31 days. S3 objects already send a 1-year Cache-Control; this is the
    //  floor if one ever doesn't.
    minimumCacheTTL: 2678400,
  },
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      //  The homepage used to live at /home. It is served at / now, so retire
      //  the old URL with a 308 instead of leaving a 404 behind for anything
      //  that already indexed or linked it.
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
      //  /about-myCANN was a "Coming Soon" placeholder that was never written.
      //  The /myCANN doorway now explains what an account is for, so send the
      //  old URL there instead of leaving a 404.
      {
        source: "/about-myCANN",
        destination: "/myCANN",
        permanent: true,
      },
      //  Order history moved from /purchases to /orders. Confirmation and
      //  shipped emails already sent link to the old paths. :path* also
      //  matches the bare /purchases.
      {
        source: "/purchases/:path*",
        destination: "/orders/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
