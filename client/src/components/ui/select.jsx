import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils.js";

export const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full appearance-none rounded-lg border border-border bg-white px-3 py-1 pr-8 text-sm text-ink outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ink/30 disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
  </div>
));
Select.displayName = "Select";
