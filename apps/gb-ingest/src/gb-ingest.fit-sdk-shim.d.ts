// Ambient declaration for @garmin/fitsdk — the package ships JS only.
// Narrow surface area: just what gb-ingest.fit.ts exercises.

declare module '@garmin/fitsdk' {
  export const Stream: { fromBuffer: (buffer: Buffer) => unknown };
  export const Decoder: new (stream: unknown) => {
    read: () => {
      messages: {
        sessionMesgs?: Record<string, unknown>[];
        recordMesgs?: Record<string, unknown>[];
      };
      errors: unknown[];
    };
  };
}
