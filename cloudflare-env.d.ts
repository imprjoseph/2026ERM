/// <reference types="@cloudflare/workers-types" />

declare global {
  interface Env {
    DB: D1Database;
    ASSETS: Fetcher;
    IMAGES: {
      input(stream: ReadableStream): {
        transform(options: Record<string, unknown>): {
          output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
        };
      };
    };
  }
}

declare module "cloudflare:workers" {
  export const env: Env;
}

export {};
