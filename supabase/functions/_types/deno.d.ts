// Typecheck-only stubs for the Deno globals the functions use (see tsconfig.json here).
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};
