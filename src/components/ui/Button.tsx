import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 
  | 'primary' 
  | 'success' 
  | 'danger' 
  | 'secondary' 
  | 'glass' 
  | 'ghost' 
  | 'activeTab';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Button({
  children,
  className = '',
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) {
  // Base classes for consistent design
  const baseClasses = 'cursor-pointer inline-flex items-center justify-center font-bold font-sans transition-all duration-200 outline-none select-none disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] rounded-xl';

  // Variant mappings matching Figma design presets
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-950/40 border border-indigo-400/20',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/20 shadow-md shadow-emerald-950/20',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-500/20 shadow-md shadow-rose-950/20',
    secondary: 'bg-[#111318]/90 hover:bg-[#181A22] text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-white',
    glass: 'bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-300 hover:text-white',
    ghost: 'text-zinc-400 hover:text-white hover:bg-zinc-900/40 bg-transparent',
    activeTab: 'bg-gradient-to-r from-[#6366F1] to-purple-600 text-white shadow-lg shadow-indigo-950/50'
  };

  // Size mappings
  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'text-[11px] py-2 px-3.5 gap-1.5 rounded-lg',
    md: 'text-xs py-2.5 px-4.5 gap-2 rounded-xl',
    lg: 'text-sm py-3 px-6 gap-2.5 rounded-2xl',
    icon: 'p-2.5 rounded-xl'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0 flex items-center justify-center">{leftIcon}</span>
      )}
      
      {size !== 'icon' && children}
      
      {!isLoading && rightIcon && (
        <span className="shrink-0 flex items-center justify-center">{rightIcon}</span>
      )}
    </button>
  );
}
