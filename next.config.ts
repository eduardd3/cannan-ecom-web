import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
