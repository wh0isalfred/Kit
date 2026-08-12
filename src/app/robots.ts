import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Student/admin areas — nothing here is useful in search results,
      // and /smportal + /admin just redirect to a login anyway.
      disallow: ["/admin", "/smportal", "/summer"],
    },
    sitemap: "https://www.kitacademy.net/sitemap.xml",
  };
}