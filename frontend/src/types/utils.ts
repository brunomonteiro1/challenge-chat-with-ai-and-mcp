/**
 * Type utility functions and helpers
 */


export type NonNullable<T> = T extends null | undefined ? never : T;


export type Required<T> = {
  [P in keyof T]-?: T[P];
};


export type RequiredProps<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
};


export type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;


export type StrictProps<T, K extends keyof T> = Pick<T, K>;


export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}


export function isString(value: unknown): value is string {
  return typeof value === 'string';
}


export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}


export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}


export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}


export function isArray<T>(value: unknown): value is Array<T> {
  return Array.isArray(value);
}


export function assertType<T>(value: unknown, typeGuard: (v: unknown) => v is T, errorMessage: string): T {
  if (!typeGuard(value)) {
    throw new Error(errorMessage);
  }
  return value;
}


export function safeCast<T>(value: unknown, typeGuard: (v: unknown) => v is T, fallback: T): T {
  return typeGuard(value) ? value : fallback;
}
