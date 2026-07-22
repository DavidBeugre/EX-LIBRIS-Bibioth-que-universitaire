import React from "react";
import { cn } from "../../lib/utils.js";

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus-visible:ring-2 focus-visible:ring-ink/30 disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
