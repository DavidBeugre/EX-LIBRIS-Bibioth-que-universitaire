import React from "react";
import { cn } from "../../lib/utils.js";

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-lg border border-border bg-white px-3 py-1 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus-visible:ring-2 focus-visible:ring-ink/30 disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
