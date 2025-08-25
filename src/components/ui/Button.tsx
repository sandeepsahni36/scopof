import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
        secondary:
          'bg-white text-gray-900 border border-gray-300 hover:bg-gray-100 focus-visible:ring-gray-500',
        accent:
          'bg-accent-500 text-white hover:bg-accent-600 focus-visible:ring-accent-500',
        outline:
          'bg-transparent border border-primary-600 text-primary-600 hover:bg-primary-50 focus-visible:ring-primary-500',
        ghost:
          'bg-transparent hover:bg-gray-100 text-gray-700 hover:text-gray-900 focus-visible:ring-gray-500',
        link:
          'bg-transparent underline-offset-4 hover:underline text-primary-600 hover:text-primary-700 p-0 focus-visible:ring-primary-500 h-auto',
        danger:
          'bg-error-500 text-white hover:bg-error-700 focus-visible:ring-error-500',
        success:
          'bg-success-500 text-white hover:bg-success-700 focus-visible:ring-success-500',

        // Premium “boxed outline” used for Field Types in TemplateDetailPage
        outlineBox:
          'bg-white border-2 border-primary-300 text-primary-700 hover:bg-primary-50 focus-visible:ring-primary-500 shadow-sm hover:shadow',
      },
      size: {
        default: 'h-10 sm:h-11 py-2 px-4 text-sm sm:text-base',
        sm: 'h-8 sm:h-9 px-3 text-xs sm:text-sm',
        lg: 'h-11 sm:h-12 px-5 text-base',
        icon: 'h-10 sm:h-11 w-10 sm:w-11',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
