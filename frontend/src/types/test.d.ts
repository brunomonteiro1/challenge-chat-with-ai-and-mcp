/// <reference types="@testing-library/jest-dom" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(...classNames: string[]): R;
      toHaveStyle(style: string | Record<string, unknown>): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}