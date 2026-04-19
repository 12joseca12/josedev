/**
 * Central shared types for the whole repository.
 *
 * Rules:
 * - Export ONLY types (no runtime exports).
 * - Consumers must use `import type { ... } from "@/lib/types"`.
 */

// -----------------------------------------------------------------------------
// Core utilities
// -----------------------------------------------------------------------------

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export type Maybe<T> = T | null | undefined;

export type Id<TName extends string = string> = string & { readonly __brand: TName };

export type ISODateString = string & { readonly __brand: "ISODateString" };

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type NonEmptyArray<T> = readonly [T, ...T[]];

export type DeepReadonly<T> =
  T extends (...args: never[]) => unknown
    ? T
    : T extends readonly (infer U)[]
      ? readonly DeepReadonly<U>[]
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;

export type DeepPartial<T> =
  T extends (...args: never[]) => unknown
    ? T
    : T extends readonly (infer U)[]
      ? readonly DeepPartial<U>[]
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;

// -----------------------------------------------------------------------------
// API / Services
// -----------------------------------------------------------------------------

export type ApiErrorCode =
  | "unknown"
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "server_error";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: JsonValue;
};

export type Result<T, E = ApiError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

// -----------------------------------------------------------------------------
// UI
// -----------------------------------------------------------------------------

export type LoadingState = "idle" | "loading" | "success" | "error";

// -----------------------------------------------------------------------------
// App-level placeholders (extend as the domain grows)
// -----------------------------------------------------------------------------

export type Locale = "es" | "en";
