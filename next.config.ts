import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverActions: {
      // Default is 1MB, which rejected a student's homework upload before any
      // of our code ran. 4MB keeps us under Vercel's own ~4.5MB serverless
      // function payload cap — setting this higher won't help, the platform
      // limit binds first. Real fix for larger files is direct-to-Supabase
      // upload (browser uploads straight to storage, bypassing Vercel).
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;