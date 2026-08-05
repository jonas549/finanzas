"use client";

/// Botón de submit que pide confirmación antes de dejar pasar el envío.
/// Va dentro de un <form action={serverAction}>.
export function BotonConfirmar({
  children,
  confirmacion,
  className = "",
}: {
  children: React.ReactNode;
  confirmacion: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(confirmacion)) e.preventDefault();
      }}
      className={className}
    >
      {children}
    </button>
  );
}
