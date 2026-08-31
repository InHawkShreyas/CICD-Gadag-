import { useState, useMemo, useEffect } from "react";
import {
  Plus, Clock, MessageSquare,
  Mail, Phone, Headphones,
  ChevronRight, Search, X, Loader2,
  ArrowLeft, HelpCircle,
} from "lucide-react";
import AppLayout from "../../components/layouts/AppLayout";
import { getLookupsByType, type LookupResponse } from "../../services/lookupService";
import {
  getFaqs, type FaqResponse,
} from "../../services/faqService";
import {
  getMyTickets, getTicketById, createTicket, addTicketMessage, updateTicketMessage,
  type SupportTicketResponse, type SupportTicketDetailResponse,
} from "../../services/supportTicketService";
import { parseServerDate, formatBubbleTime, chatWallpaperStyle } from "../../utils/formatters";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ChatBubble } from "../../components/ui/ChatBubble";
import { TicketRow } from "../../components/ui/TicketRow";
import { MessageComposer } from "../../components/ui/MessageComposer";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";

const ISSUE_LOOKUP_TYPE = "Support";

/* ─── Chat Pane (right column — the conversation for the selected ticket) ───── */

const ChatPane = ({
  ticket, onStartNewTicket, onTicketUpdated, onBack,
}: {
  ticket: SupportTicketResponse;
  onStartNewTicket: () => void;
  onTicketUpdated: () => void;
  onBack: () => void;
}) => {
  const [detail, setDetail] = useState<SupportTicketDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const isClosed = ticket.statusName === "Closed";
  const username = typeof window !== "undefined" ? localStorage.getItem("username") ?? "" : "";

  const loadDetail = () => {
    setLoadingDetail(true);
    getTicketById(ticket.id)
      .then(setDetail)
      .finally(() => setLoadingDetail(false));
  };

  useEffect(() => {
    setReply("");
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  const hasAdminReply = !!detail?.messages.some((m) => m.senderType === "admin");

  const handleSendReply = async () => {
    if (!reply.trim() || isClosed) return;
    setSendingReply(true);
    try {
      await addTicketMessage({
        ticketId: ticket.id,
        senderType: "student",
        senderName: username,
        message: reply.trim(),
      });
      setReply("");
      loadDetail();
      onTicketUpdated();
    } finally {
      setSendingReply(false);
    }
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    const updatedBy = username || undefined;
    try {
      const updated = await updateTicketMessage(messageId, { message: newText, updatedBy });
      setDetail((prev) =>
        prev ? { ...prev, messages: prev.messages.map((m) => (m.id === messageId ? updated : m)) } : prev
      );
    } catch {
      // Backend call failed — still reflect the edit locally rather than silently reverting it.
      setDetail((prev) =>
        prev
          ? {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === messageId ? { ...m, message: newText, updateOn: new Date().toISOString(), updatedBy } : m
            ),
          }
          : prev
      );
    }
  };

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
      {loadingDetail ? (
        <div className="flex items-center justify-center flex-1 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <>
          {/* Chat header */}
          <div className="flex items-center flex-shrink-0 gap-3 px-4 py-3 border-b border-gray-100">
            <button
              onClick={onBack}
              data-testid="support-chat-back"
              className="flex-shrink-0 text-gray-400 lg:hidden hover:text-gray-700"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center justify-center flex-shrink-0 rounded-full w-9 h-9 bg-emerald-100">
              <Headphones size={16} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{ticket.issueName ?? "Support Ticket"}</p>
              <p className="font-mono text-[10px] text-gray-400">{ticket.ticketNo}</p>
            </div>
            <StatusBadge status={ticket.statusName} testId="support-chat-status" />
          </div>

          {/* Messages */}
          <div
            className="flex-1 min-h-0 px-4 py-3 space-y-2 overflow-y-auto hover-scrollbar bg-[#eef2ec]"
            style={chatWallpaperStyle}
          >
            {detail?.messages.length ? (
              [...detail.messages]
                .sort((a, b) => parseServerDate(a.insertOn).getTime() - parseServerDate(b.insertOn).getTime())
                .map((m) => (
                  <ChatBubble
                    key={m.id}
                    mine={m.senderType === "student"}
                    label={m.senderType === "admin" ? `Support${m.senderName ? ` · ${m.senderName}` : ""}` : undefined}
                    text={m.message}
                    time={formatBubbleTime(m.insertOn)}
                    ticks={m.senderType === "student" ? (hasAdminReply ? "read" : "sent") : undefined}
                    editable={m.senderType === "student" && !isClosed}
                    onSave={(newText) => handleEditMessage(m.id, newText)}
                    edited={!!m.updateOn}
                    editedTooltip={m.updatedBy ? `Edited by ${m.updatedBy}` : undefined}
                    testId={`support-chat-bubble-${m.id}`}
                  />
                ))
            ) : (
              <p className="py-6 text-sm text-center text-gray-400">No messages yet.</p>
            )}

            {!hasAdminReply && !loadingDetail && !isClosed && (
              <div className="flex justify-center py-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-amber-700 bg-amber-500/15 border border-amber-700/30 rounded-full">
                  <Clock size={11} /> Awaiting response · usually within 24–48 hrs
                </span>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="flex-shrink-0 p-3 border-t border-gray-100">
            {isClosed ? (
              <div className="flex flex-col items-center gap-2 py-1 text-center">
                <p className="text-xs text-gray-500">This conversation is closed.</p>
                <button
                  onClick={onStartNewTicket}
                  data-testid="support-start-new-ticket"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white transition-colors rounded-lg bg-primary hover:bg-primary/90"
                >
                  <Plus size={13} /> Start a new conversation
                </button>
              </div>
            ) : (
              <MessageComposer
                value={reply}
                onChange={setReply}
                onSend={handleSendReply}
                sending={sendingReply}
                placeholder="Type a message…"
                inputTestId="support-reply-input"
                sendTestId="support-send-reply"
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ─── FAQ Item Component (compact row — opens the detail modal on click) ────── */

const FAQItem = ({ faq, onOpen, testId }: { faq: FaqResponse; onOpen: () => void; testId?: string }) => (
  <button
    onClick={onOpen}
    data-testid={testId}
    className="flex items-start w-full gap-3 px-4 py-3 text-left transition-colors bg-white border border-gray-200 rounded-lg hover:border-primary/30 hover:bg-primary/5"
  >
    <div className="flex-1 min-w-0">
      <p className="mb-1 text-xs font-semibold text-primary">{faq.category}</p>
      <p className="text-sm font-semibold text-gray-800 line-clamp-2">{faq.question}</p>
    </div>
    <div className="flex-shrink-0 mt-0.5">
      <ChevronRight size={16} className="text-gray-300" />
    </div>
  </button>
);

/* ─── FAQ Detail Drawer (separate panel that slides in to read the full answer) ── */

const FAQDetailDrawer = ({ faq, onClose, testId }: { faq: FaqResponse; onClose: () => void; testId?: string }) => (
  <SlideOverDrawer
    icon={<HelpCircle size={16} className="text-primary" />}
    eyebrow={faq.category}
    title={faq.question}
    onClose={onClose}
    testId={testId}
  >
    {() => (
      // Answer — its own scrollable region so long answers stay readable
      <div className="flex-1 min-h-0 p-5 overflow-y-auto hover-scrollbar bg-gray-50">
        <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{faq.answer}</p>
      </div>
    )}
  </SlideOverDrawer>
);

/* ─── FAQ Panel Component ─────────────────────────────────────────────────── */

const FAQPanel = ({ faqs, loading }: { faqs: FaqResponse[]; loading: boolean }) => {
  const [search, setSearch] = useState("");
  const [selectedFaq, setSelectedFaq] = useState<FaqResponse | null>(null);

  const filtered = useMemo(() =>
    faqs.filter((faq) =>
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase()) ||
      faq.category.toLowerCase().includes(search.toLowerCase())
    ),
    [faqs, search]);

  const categories = useMemo(() => [...new Set(faqs.map((f) => f.category))], [faqs]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* HEADER + SEARCH + CATEGORY TABS — fixed at the top */}
      <div className="flex-shrink-0 p-4 space-y-3 border-b border-gray-100 bg-gray-50">
        <div>
          <h2 className="text-base font-bold text-gray-800">Frequently Asked Questions</h2>
          <p className="mt-0.5 text-xs text-gray-500">Find quick answers to common questions</p>
        </div>

        <div className="relative">
          <Search size={14} className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FAQs…"
            data-testid="support-faq-search"
            className="w-full py-2 pr-3 text-sm transition-all bg-white border border-gray-200 rounded-lg pl-9 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto hover-scrollbar">
          <button
            onClick={() => setSearch("")}
            data-testid="support-faq-category-all"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${search === ""
              ? "bg-primary/10 text-primary border border-primary/30 shadow-sm"
              : "bg-white text-gray-600 border border-gray-200 hover:text-gray-800"
              }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSearch(cat)}
              data-testid={`support-faq-category-${cat}`}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${search === cat
                ? "bg-primary/10 text-primary border border-primary/30 shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:text-gray-800"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ LIST — fills remaining height, scrolls independently; each row opens the detail modal */}
      <div className="flex-1 min-h-0 p-3 space-y-2 overflow-y-auto hover-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare size={24} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">No FAQs match your search</p>
          </div>
        ) : (
          filtered.map((faq) => (
            <FAQItem
              key={faq.id}
              faq={faq}
              onOpen={() => setSelectedFaq(faq)}
              testId={`support-faq-item-${faq.id}`}
            />
          ))
        )}
      </div>

      {/* CTA — fixed at the bottom */}
      <div className="flex-shrink-0 p-3 border-t border-gray-100">
        <div className="p-3 border rounded-lg border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <p className="mb-1 text-xs text-gray-600">Can&apos;t find your answer?</p>
          <p className="text-sm font-semibold text-primary">Raise a support ticket to connect with our team</p>
        </div>
      </div>

      {selectedFaq && (
        <FAQDetailDrawer faq={selectedFaq} onClose={() => setSelectedFaq(null)} testId="support-faq-detail-drawer" />
      )}
    </div>
  );
};

/* ─── New Ticket Modal ────────────────────────────────────────────────────── */

const NewTicketModal = ({
  issueOptions, onClose, onCreated,
}: {
  issueOptions: LookupResponse[];
  onClose: () => void;
  onCreated: () => void;
}) => {
  const [issueId, setIssueId] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!issueId) { setError("Please select an issue category."); return; }
    if (!description.trim()) { setError("Please describe your issue."); return; }

    const username = localStorage.getItem("username") ?? "";
    if (!username) { setError("You must be logged in to raise a ticket."); return; }

    setSubmitting(true);
    setError("");
    try {
      await createTicket({ username, issueId, description: description.trim() });
      onCreated();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md p-5 space-y-4 bg-white shadow-xl rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="support-new-ticket-modal"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">New Support Ticket</h3>
          <button onClick={onClose} data-testid="support-new-ticket-close" className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">Issue Category</label>
          <select
            value={issueId}
            onChange={(e) => setIssueId(e.target.value)}
            data-testid="support-new-ticket-issue"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select an issue…</option>
            {issueOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe your issue in detail…"
            data-testid="support-new-ticket-description"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          data-testid="support-new-ticket-submit"
          className="flex items-center justify-center w-full gap-2 px-4 py-2.5 font-semibold text-white transition-colors bg-primary rounded-lg shadow-sm hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Submit Ticket
        </button>
      </div>
    </div>
  );
};

/* ─── Main Page Component ─────────────────────────────────────────────────── */

export default function StudentSupportPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [faqs, setFaqs] = useState<FaqResponse[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicketResponse[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [issueOptions, setIssueOptions] = useState<LookupResponse[]>([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const username = typeof window !== "undefined" ? localStorage.getItem("username") ?? "" : "";

  const loadTickets = () => {
    if (!username) { setTicketsLoading(false); return; }
    setTicketsLoading(true);
    getMyTickets(username)
      .then((data) => {
        setTickets(data);
        setSelectedId((prev) => prev ?? (data.length ? data[0].id : null));
      })
      .finally(() => setTicketsLoading(false));
  };

  useEffect(() => {
    getFaqs(false).then(setFaqs).finally(() => setFaqsLoading(false));
    getLookupsByType(ISSUE_LOOKUP_TYPE).then(setIssueOptions);
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() =>
    activeTab === "All" ? tickets : tickets.filter((t) => t.statusName === activeTab),
    [activeTab, tickets]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { All: tickets.length };
    const statuses = [...new Set(tickets.map((t) => t.statusName ?? "Unknown"))];
    statuses.forEach((s) => {
      base[s] = tickets.filter((t) => t.statusName === s).length;
    });
    return base;
  }, [tickets]);

  const tabs = ["All", ...Object.keys(counts).filter(t => t !== "All")];
  const openCount = counts["Open"] ?? 0;
  const selectedTicket = tickets.find((t) => t.id === selectedId) ?? null;

  return (
    <AppLayout pageTitle="Support">
      <div
        className="flex flex-col h-full pb-4"
        style={{ zoom: 0.9 }}
      >
        {/* HEADER */}
        <div className="flex items-start justify-between flex-shrink-0 gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Support Center</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {openCount > 0
                ? `${openCount} open ticket${openCount > 1 ? "s" : ""} awaiting a response.`
                : "Get help with your admission queries and raise support tickets."}
            </p>
          </div>
          <button
            onClick={() => setShowNewTicket(true)}
            className="flex items-center flex-shrink-0 gap-2 px-4 py-2 mt-0.5 font-semibold text-white transition-colors rounded-lg shadow-sm bg-primary hover:bg-primary/90"
          >
            <Plus size={16} /> New Ticket
          </button>
        </div>

        <div className="flex gap-4 h-[calc(100vh-320px)] min-h-[480px]">

          {/* ── FAQ COLUMN ── */}
          <div className={`${selectedTicket ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-[300px] flex-shrink-0 h-full min-h-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden`}>
            <FAQPanel faqs={faqs} loading={faqsLoading} />
          </div>

          {/* ── TICKET LIST COLUMN ── */}
          <div className={`${selectedTicket ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-[300px] flex-shrink-0 h-full min-h-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden`}>
            <div className="flex-shrink-0 p-3 space-y-2.5 border-b border-gray-100 bg-gray-50">
              <p className="px-1 text-sm font-bold text-gray-800">My Tickets</p>
              <div className="flex flex-wrap gap-1.5">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${activeTab === tab
                      ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:text-gray-800 hover:border-gray-300"
                      }`}
                  >
                    {tab}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab ? "bg-primary/20 text-primary" : "bg-gray-200 text-gray-600"
                      }`}>
                      {counts[tab] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 p-2 space-y-1 overflow-y-auto hover-scrollbar">
              {ticketsLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
                  <div className="flex items-center justify-center w-12 h-12 text-gray-300 rounded-full bg-gray-50">
                    <MessageSquare size={20} />
                  </div>
                  <p className="text-sm text-gray-400">
                    {activeTab === "All"
                      ? 'No tickets yet. Click "New Ticket" to raise your first support request.'
                      : `No tickets with status "${activeTab}".`}
                  </p>
                </div>
              ) : (
                filtered.map((t) => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    active={t.id === selectedId}
                    onClick={() => setSelectedId(t.id)}
                  />
                ))
              )}
            </div>

            {filtered.length > 0 && (
              <p className="px-3 py-2 text-[11px] text-right text-gray-400 border-t border-gray-100 flex-shrink-0">
                {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
                {activeTab !== "All" ? ` in ${activeTab}` : " total"}
              </p>
            )}
          </div>

          {/* ── CHAT COLUMN ── */}
          <div className={`${selectedTicket ? "flex" : "hidden lg:flex"} flex-1 h-full min-h-0 min-w-0`}>
            {selectedTicket ? (
              <ChatPane
                key={selectedTicket.id}
                ticket={selectedTicket}
                onStartNewTicket={() => setShowNewTicket(true)}
                onTicketUpdated={loadTickets}
                onBack={() => setSelectedId(null)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 bg-white border border-gray-200 shadow-sm rounded-2xl">
                <div className="flex items-center justify-center text-gray-300 bg-gray-100 rounded-full w-14 h-14">
                  <MessageSquare size={22} />
                </div>
                <p className="text-sm text-gray-500">Select a ticket to view the conversation.</p>
              </div>
            )}
          </div>
        </div>

        {/* CONTACT */}
        <div className="flex-shrink-0 p-4 mt-4 space-y-3 border border-gray-200 shadow-sm bg-gradient-to-br from-white to-gray-50 rounded-2xl">
          <p className="text-sm font-bold text-gray-800">Need immediate help?</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-3 transition-colors bg-white border border-gray-100 rounded-lg hover:border-primary/30 hover:bg-primary/5">
              <div className="flex items-center justify-center flex-shrink-0 rounded-lg bg-primary/10 w-9 h-9">
                <Mail size={15} className="text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600">Email</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">enquiry.ksrdpru@gmail.com</p>
                <p className="text-[11px] text-gray-500 mt-1">Response: 24–48 hours</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 transition-colors bg-white border border-gray-100 rounded-lg hover:border-emerald-200 hover:bg-emerald-50/50">
              <div className="flex items-center justify-center flex-shrink-0 rounded-lg w-9 h-9 bg-emerald-100">
                <Phone size={15} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600">Phone</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">08372-230338</p>
                <p className="text-[11px] text-gray-500 mt-1">Mon–Fri · 9 AM – 5 PM IST</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showNewTicket && (
        <NewTicketModal
          issueOptions={issueOptions}
          onClose={() => setShowNewTicket(false)}
          onCreated={loadTickets}
        />
      )}
    </AppLayout>
  );
}