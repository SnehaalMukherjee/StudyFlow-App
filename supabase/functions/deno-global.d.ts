/** Minimal Deno globals for Edge Function type-checking in the IDE. */
declare const Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): void;
  env: { get(key: string): string | undefined };
};
