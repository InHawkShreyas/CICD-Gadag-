export const STATUS_CFG: Record<string, { badge: string; dot: string; solid: string }> = {
  Open: { badge: "bg-teal-100 text-teal-700 border-teal-200", dot: "bg-teal-500", solid: "bg-teal-500" },
  "In Progress": { badge: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", solid: "bg-amber-500" },
  Resolved: { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", solid: "bg-emerald-500" },
  Closed: { badge: "bg-gray-100 text-gray-500 border-gray-200", dot: "bg-gray-400", solid: "bg-gray-400" },
};

export const scfg = (s?: string) =>
  STATUS_CFG[s ?? ""] ?? { badge: "bg-gray-100 text-gray-500 border-gray-200", dot: "bg-gray-400", solid: "bg-gray-400" };

export const StatusBadge = ({ status, testId }: { status?: string; testId?: string }) => {
  const s = scfg(status);
  return (
    <span data-testid={testId} className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {status ?? "Unknown"}
    </span>
  );
};