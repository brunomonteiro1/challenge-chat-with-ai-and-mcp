"use client";

import { forwardRef, InputHTMLAttributes, useId } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    className = "", 
    fullWidth = false,
    id,
    ...props 
  }, ref) => {

    const generatedId = useId();
    const inputId = id || `input-${generatedId}`;
    

    const baseClasses = "px-3 py-2 bg-white dark:bg-gray-800 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 transition-all";
    

    const errorClasses = error 
      ? "border-red-300 dark:border-red-700 text-red-900 dark:text-red-300 placeholder-red-300 dark:placeholder-red-700" 
      : "border-gray-300 dark:border-gray-700";
    

    const widthClasses = fullWidth ? "w-full" : "";
    
    const inputClasses = [
      baseClasses,
      errorClasses,
      widthClasses,
      className
    ].join(" ");
    
    return (
      <div className={`${fullWidth ? "w-full" : ""}`}>
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p 
            id={`${inputId}-error`}
            className="mt-1 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
