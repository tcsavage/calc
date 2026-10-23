/** Where the session and saved rules are kept between visits. Values are opaque encoded envelopes. */
export interface SessionPort {
  readonly available: boolean;
  loadSession(): unknown;
  saveSession(envelope: unknown): void;
  clearSession(): void;
  loadSaved(): unknown;
  saveSaved(envelope: unknown): void;
}
