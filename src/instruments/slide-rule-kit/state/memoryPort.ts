import type { SessionPort } from "./ports";

export interface MemoryPort extends SessionPort {
  session: unknown;
  saved: unknown;
}

/** An in-memory SessionPort, for tests. */
export function memoryPort(
  initial: { session?: unknown; saved?: unknown; available?: boolean } = {},
): MemoryPort {
  const port: MemoryPort = {
    available: initial.available ?? true,
    session: initial.session ?? null,
    saved: initial.saved ?? null,
    loadSession: () => port.session,
    saveSession: (envelope) => {
      port.session = envelope;
    },
    clearSession: () => {
      port.session = null;
    },
    loadSaved: () => port.saved,
    saveSaved: (envelope) => {
      port.saved = envelope;
    },
  };
  return port;
}
