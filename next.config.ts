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
    ];
  },
};

export default nextConfig;
