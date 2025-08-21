import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || props.name;
    
    return (
      <div className="space-y-0.5">
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-xs sm:text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          className={cn(
            "h-10 sm:h-11 w-full rounded-md border px-3 py-1.5 sm:py-2 text-base transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error 
              ? "border-error-300 text-error-900 placeholder-error-300 focus:border-error-500 focus:ring-error-500" 
              : "border-gray-300 placeholder:text-gray-400",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-xs text-error-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };