import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-base-600 bg-base-800 px-3 py-2 text-sm text-ink-50 placeholder:text-ink-500 focus:border-accent-violet focus:outline-none",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
