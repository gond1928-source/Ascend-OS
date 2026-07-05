import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
          variant === "primary" && "bg-accent-violet text-white hover:bg-accent-violet/90",
          variant === "outline" && "border border-base-600 text-ink-300 hover:border-accent-violet/60 hover:text-ink-50",
          variant === "ghost" && "text-ink-300 hover:text-ink-50",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
