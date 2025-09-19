"use client";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'default', size = 'md', className = "", ...rest }: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-0 focus:shadow-none";
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm", 
    lg: "px-6 py-3 text-base"
  };

  const variantClasses = {
    default: "bg-[var(--primary)] text-[var(--text)] hover:bg-[var(--primary-strong)]",
    outline: "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)]",
    ghost: "text-[var(--text)] hover:bg-[var(--surface-alt)]"
  };

  return (
    <button
      className={[
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        className,
      ].join(" ")}
      {...rest}
    />
  );
}
