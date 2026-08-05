import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finanzas",
  description: "Finanzas personales en dólares",
};

const NAVEGACION = [
  { href: "/", texto: "Dashboard" },
  { href: "/movimientos", texto: "Movimientos" },
  { href: "/fijos", texto: "Fijos" },
  { href: "/proyeccion", texto: "Proyección" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <header className="border-b border-borde bg-superficie">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Finanzas
            </Link>
            <nav className="flex gap-4 text-sm">
              {NAVEGACION.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-suave transition-colors hover:text-texto"
                >
                  {item.texto}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
