/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hfse.edu.sg",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "enrol.hfse.edu.sg",
        pathname: "/assets/**",
      },
    ],
  },
};

module.exports = nextConfig;
