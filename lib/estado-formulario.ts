// El estado que devuelven las server actions de formulario.
//
// Vive aquí y no en app/actions.ts porque un archivo "use server" sólo puede
// exportar funciones async: exportar una constante desde ahí rompe el módulo
// entero en tiempo de carga.

export type EstadoFormulario = {
  ok: boolean;
  mensaje?: string;
  campo?: string;
};

export const ESTADO_INICIAL: EstadoFormulario = { ok: false };
