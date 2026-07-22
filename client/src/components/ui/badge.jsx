import React from "react";
import { cn } from "../../lib/utils.js";

export function Badge({ className, tone = "ink", children, ...props }) {
  const tones = {
    ink: "bg-[#EFEDE4] text-ink",
    moss: "bg-moss-bg text-moss",
    brass: "bg-brass-bg text-brass",
    buckram: "bg-buckram-bg text-buckram",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    >
      {children}
    </span>
  );
}
