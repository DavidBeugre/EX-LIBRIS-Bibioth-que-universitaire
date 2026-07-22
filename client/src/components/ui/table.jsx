import React from "react";
import { cn } from "../../lib/utils.js";

export const Table = ({ className, ...props }) => (
  <div className="w-full overflow-auto">
    <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
);
export const TableHeader = ({ className, ...props }) => <thead className={cn("bg-[#F1ECDD]", className)} {...props} />;
export const TableBody = ({ className, ...props }) => <tbody className={className} {...props} />;
export const TableRow = ({ className, ...props }) => (
  <tr className={cn("border-b border-border transition-colors last:border-0 hover:bg-[#F7F3E8]", className)} {...props} />
);
export const TableHead = ({ className, ...props }) => (
  <th className={cn("h-10 px-4 text-left align-middle text-xs font-medium uppercase tracking-wide text-ink-muted", className)} {...props} />
);
export const TableCell = ({ className, ...props }) => (
  <td className={cn("p-4 align-middle text-ink", className)} {...props} />
);
