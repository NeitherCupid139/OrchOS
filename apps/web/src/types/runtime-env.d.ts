declare module "bun" {
  export function spawn(options: Record<string, unknown>): any;

  export class S3Client {
    constructor(options: Record<string, unknown>);
    write(
      key: string,
      data: File | Blob | string,
      options?: Record<string, unknown>,
    ): Promise<void>;
  }
}

declare module "cloudflare:workers" {
  export const env: Cloudflare.Env;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec<T = unknown>(query: string): Promise<D1Result<T>[]>;
}

interface R2ObjectBody {
  body?: ReadableStream<Uint8Array> | null;
  httpMetadata?: { contentType?: string };
}

interface R2Bucket {
  put(
    key: string,
    value: ReadableStream<Uint8Array> | string,
    options?: Record<string, unknown>,
  ): Promise<void>;
  get(key: string): Promise<R2ObjectBody | null>;
}

declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    Sandbox?: unknown;
    TAVILY_API_KEY?: string;
  }
}
