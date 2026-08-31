import { Clock, Headphones } from "lucide-react";
import type { SupportTicketResponse } from "../../services/supportTicketService";
import { StatusBadge } from "./StatusBadge";
import { formatBubbleTime } from "../../utils/formatters";

export const TicketRow = ({
  ticket, active, onClick, variant = "standalone", testId,
}: {
  ticket: SupportTicketResponse;
  active: boolean;
  onClick: () => void;
  variant?: "standalone" | "grouped";
  testId?: string;
}) => {
  const awaiting = ticket.statusName === "Open";

  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${active
        ? "bg-primary/10 border-primary/30 shadow-sm"
        : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-100"
        }`}
    >
      {variant === "standalone" ? (
        <div className={`flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-lg ${active ? "bg-primary/15" : "bg-gray-100"}`}>
          {awaiting
            ? <Clock size={15} className={active ? "text-primary" : "text-amber-500"} />
            : <Headphones size={15} className={active ? "text-primary" : "text-gray-400"} />}
        </div>
      ) : (
        awaiting && <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500" />
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${active ? "text-primary" : "text-gray-800"}`}>
          {ticket.issueName ?? "Support Ticket"}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${active ? "bg-primary/15 text-primary" : "bg-gray-100 text-gray-500"}`}>
            {ticket.ticketNo}
          </span>
          <StatusBadge status={ticket.statusName} />
        </div>
      </div>

      <span className={`text-[10px] flex-shrink-0 ${active ? "text-primary" : "text-gray-400"}`}>
        {formatBubbleTime(ticket.updateOn ?? ticket.insertOn)}
      </span>
    </button>
  );
};