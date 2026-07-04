import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
}

export function Card({ children, className, title, eyebrow, action }: CardProps) {
  return (
    <div className={cn("app-card", className)}>
      {(title || eyebrow || action) && (
        <div className="app-card-header">
          <div>
            {eyebrow && <p className="app-card-eyebrow">{eyebrow}</p>}
            {title && <h3 className="app-card-title">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
