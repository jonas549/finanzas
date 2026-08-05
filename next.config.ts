import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 es un módulo nativo (.node): si el bundler lo intenta
  // empaquetar, falla al resolverlo. Se deja que Node lo cargue en runtime.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;
