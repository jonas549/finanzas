import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg` abre sockets y carga bindings opcionales: se deja que Node lo resuelva
  // en runtime en vez de que el bundler lo empaquete.
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
};

export default nextConfig;
