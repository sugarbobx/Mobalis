import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    // bottom-left (the default) sits on top of the sidebar footer's
    // "Changer d'espace" link and steals its clicks
    position: "top-right",
  },
};

export default nextConfig;
