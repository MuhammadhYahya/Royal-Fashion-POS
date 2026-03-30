const nextConfig = {
  output: "standalone",
  typescript: {
    // Type-checking is enforced by `npm run verify` before build.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
