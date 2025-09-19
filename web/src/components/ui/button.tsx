"use client";
import { ButtonHTMLAttributes } from "react";

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      className={[
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
        // brand styles
        "bg-brand text-[var(--brand-foreground)] hover:bg-brand-600",
        // borders/focus
        "focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2",
        "ring-offset-white dark:ring-offset-[var(--df-dark-main)]",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}
