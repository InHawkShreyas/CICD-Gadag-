import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, X, MessageSquare, Tag, ArrowLeft,
  RefreshCw, Inbox, CheckCircle,
  Calendar, User as UserIcon, Clock, Plus, Trash2, Loader2,
  Info, HelpCircle, ChevronUp, ChevronDown, Pencil, Phone,
} from "lucide-react";
import AppLayout from "../../components/layouts/AppLayout";
import { getLookupsByType, type LookupResponse } from "../../services/lookupService";
import {
  getFaqs, createFaq, updateFaq, toggleFaqActive, deleteFaq,
  type FaqResponse,
} from "../../services/faqService";
import {
  getTickets, getTicketById, updateTicketStatus, updateTicketMessage,
  type SupportTicketResponse, type SupportTicketDetailResponse,
} from "../../services/supportTicketService";
import { getRegistrationByUsername } from "../../services/registrationService";
import { parseServerDate, formatBubbleTime, formatDate, chatWallpaperStyle } from "../../utils/formatters";
import { StatusBadge, scfg } from "../../components/ui/StatusBadge";
import { ChatBubble } from "../../components/ui/ChatBubble";
import { TicketRow } from "../../components/ui/TicketRow";
import { MessageComposer } from "../../components/ui/MessageComposer";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";

const STATUS_LOOKUP_TYPE = "SupportStatus";
const FAQ_CATEGORY_LOOKUP_TYPE = "Support";

function getLoggedInUsername(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("username") ?? "";
}

/* ─── Context pane tabs ──────────────────────────────────────────────────── */

type ContextKey = "details" | "faq";

const CONTEXT_TABS: { key: ContextKey; label: string; icon: typeof Info }[] = [
  { key: "details", label: "Details", icon: Info },
  { key: "faq", label: "FAQs", icon: HelpCircle },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const AVATAR_COLORS = [
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
];

const avatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

/**
 * Full name / mobile for a student, keyed by username — fetched via
 * getRegistrationByUsername (same source personal_details.tsx uses:
 * reg.name / reg.mobile), not a field on the support ticket itself.
 */
type StudentReg = { name?: string; mobile?: string };

const getFullName = (reg?: StudentReg): string => reg?.name ?? "";
const getMobile = (reg?: StudentReg): string => reg?.mobile ?? "";

/* ─── FAQ form drawer (Add / Edit — slides in from the right, same pattern as the
   student page's FAQDetailDrawer) ────────────────────────────────────────────── */

const FAQFormDrawer = ({
  mode, initialQuestion = "", initialAnswer = "", initialCategory = "",
  categoryOptions, saving, onClose, onSubmit, testId,
}: {
  mode: "add" | "edit";
  initialQuestion?: string;
  initialAnswer?: string;
  initialCategory?: string;
  categoryOptions: LookupResponse[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: { question: string; answer: string; category: string }) => void;
  testId?: string;
}) => {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState(initialAnswer);
  const [category, setCategory] = useState(initialCategory);

  const handleSubmit = () => {
    if (!question.trim() || !answer.trim()) return;
    onSubmit({ question: question.trim(), answer: answer.trim(), category: category.trim() || "General" });
  };

  return (
    <SlideOverDrawer
      icon={mode === "add" ? <Plus size={16} className="text-primary" /> : <Pencil size={16} className="text-primary" />}
      eyebrow={mode === "add" ? "New FAQ" : "Edit FAQ"}
      title={mode === "add" ? "Add a question for students" : "Update this question"}
      onClose={onClose}
      testId={testId}
    >
      {(closeAnimated) => (
        <>
          {/* Form fields — its own scrollable region so a long answer stays readable */}
          <div className="flex-1 min-h-0 p-5 space-y-4 overflow-y-auto hover-scrollbar bg-gray-50">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">Question</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="FAQ question…"
                data-testid={testId ? `${testId}-question` : undefined}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">Answer</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Answer…"
                rows={7}
                data-testid={testId ? `${testId}-answer` : undefined}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                data-testid={testId ? `${testId}-category` : undefined}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Category (defaults to General)</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.id} value={opt.name}>{opt.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer — fixed at the bottom */}
          <div className="flex flex-shrink-0 gap-2 p-4 border-t border-gray-100">
            <button
              onClick={handleSubmit}
              disabled={saving || !question.trim() || !answer.trim()}
              data-testid={testId ? `${testId}-submit` : undefined}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white transition-colors rounded-lg shadow-sm bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : mode === "add" ? "Create FAQ" : "Save Changes"}
            </button>
            <button
              onClick={closeAnimated}
              data-testid={testId ? `${testId}-cancel` : undefined}
              className="px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </SlideOverDrawer>
  );
};

/* ─── FAQ side panel (real, student-facing FAQ CRUD — lives next to the chat pane) ─ */

const FAQSidePanel = () => {
  const [faqs, setFaqs] = useState<FaqResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<LookupResponse[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit" | null>(null);
  const [editingFaq, setEditingFaq] = useState<FaqResponse | null>(null);

  const loadFaqs = () => {
    setLoading(true);
    getFaqs(true) // includeInactive — this panel needs to see and re-toggle inactive ones too
      .then(setFaqs)
      .finally(() => setLoading(false));
  };

  useEffect(loadFaqs, []);

  useEffect(() => {
    getLookupsByType(FAQ_CATEGORY_LOOKUP_TYPE).then(setCategoryOptions);
  }, []);

  const filtered = useMemo(() =>
    faqs.filter((faq) =>
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.category.toLowerCase().includes(search.toLowerCase())
    ),
    [faqs, search]);

  const closeDrawer = () => {
    setDrawerMode(null);
    setEditingFaq(null);
  };

  const handleAddFAQ = async (data: { question: string; answer: string; category: string }) => {
    setSaving(true);
    try {
      await createFaq({
        ...data,
        insertBy: getLoggedInUsername() || undefined,
      });
      closeDrawer();
      loadFaqs();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    await toggleFaqActive(id);
    loadFaqs();
  };

  const handleDelete = async (id: string) => {
    await deleteFaq(id);
    loadFaqs();
  };

  const handleEditStart = (faq: FaqResponse) => {
    setExpandedId(null);
    setEditingFaq(faq);
    setDrawerMode("edit");
  };

  const handleEditSave = async (data: { question: string; answer: string; category: string }) => {
    if (!editingFaq) return;
    setSaving(true);
    try {
      await updateFaq(editingFaq.id, data);
      closeDrawer();
      loadFaqs();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">FAQ Management</h3>
          <p className="text-[11px] text-gray-500">Shown to students</p>
        </div>
        <button
          onClick={() => setDrawerMode("add")}
          data-testid="support-faq-add"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors rounded-lg shadow-sm bg-primary hover:bg-primary/90"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search size={12} className="absolute text-gray-400 -translate-y-1/2 left-2.5 top-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search FAQs…"
          data-testid="support-faq-manage-search"
          className="w-full py-1.5 pr-2.5 pl-7 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* FAQ LIST — capped to ~4 items visible; extra FAQs scroll inside this box */}
      <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1 hover-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center text-gray-400">
            <MessageSquare size={18} className="mx-auto mb-2 text-gray-300" />
            <p className="text-xs">No FAQs found</p>
          </div>
        ) : (
          filtered.map((faq) => (
            <div
              key={faq.id}
              data-testid={`support-faq-manage-item-${faq.id}`}
              className={`p-2.5 border rounded-lg transition-all ${faq.active
                ? "bg-white border-gray-200 hover:border-gray-300"
                : "bg-gray-50 border-gray-100 opacity-60"
                }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {faq.category}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${faq.active
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                    }`}
                >
                  {faq.active ? "Active" : "Inactive"}
                </span>
                <button
                  onClick={() => handleEditStart(faq)}
                  data-testid={`support-faq-edit-${faq.id}`}
                  className="p-1 ml-auto text-gray-400 transition-colors rounded hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Edit FAQ"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
                {faq.active ? (
                  <button
                    onClick={() => handleDelete(faq.id)}
                    data-testid={`support-faq-deactivate-${faq.id}`}
                    className="p-1 text-red-500 transition-colors rounded hover:bg-red-50"
                    aria-label="Deactivate FAQ"
                    title="Deactivate"
                  >
                    <Trash2 size={12} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggle(faq.id)}
                    data-testid={`support-faq-activate-${faq.id}`}
                    className="p-1 transition-colors rounded text-emerald-600 hover:bg-emerald-50"
                    aria-label="Activate FAQ"
                    title="Activate"
                  >
                    <CheckCircle size={12} />
                  </button>
                )}
              </div>

              <button
                onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                data-testid={`support-faq-manage-toggle-${faq.id}`}
                className="flex items-start justify-between w-full gap-2 text-left"
              >
                <span className="text-xs font-semibold text-gray-800">{faq.question}</span>
                {expandedId === faq.id ? (
                  <ChevronUp size={13} className="flex-shrink-0 mt-0.5 text-gray-400" />
                ) : (
                  <ChevronDown size={13} className="flex-shrink-0 mt-0.5 text-gray-400" />
                )}
              </button>
              {expandedId === faq.id && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-gray-600">{faq.answer}</p>
              )}
            </div>
          ))
        )}
      </div>

      <p className="pt-1 text-[10px] text-center text-gray-400">
        {faqs.length} total · {faqs.filter((f) => f.active).length} active
      </p>

      {drawerMode === "add" && (
        <FAQFormDrawer
          mode="add"
          categoryOptions={categoryOptions}
          saving={saving}
          onClose={closeDrawer}
          onSubmit={handleAddFAQ}
          testId="support-faq-add-drawer"
        />
      )}

      {drawerMode === "edit" && editingFaq && (
        <FAQFormDrawer
          mode="edit"
          initialQuestion={editingFaq.question}
          initialAnswer={editingFaq.answer}
          initialCategory={editingFaq.category}
          categoryOptions={categoryOptions}
          saving={saving}
          onClose={closeDrawer}
          onSubmit={handleEditSave}
          testId="support-faq-edit-drawer"
        />
      )}
    </div>
  );
};

/* ─── Ticket group (one student — name on top, username + ticket count below) ─── */

const TicketGroup = ({
  username, tickets, reg, collapsed, onToggle, selectedId, onSelect,
}: {
  username: string;
  tickets: SupportTicketResponse[];
  reg?: StudentReg;
  collapsed: boolean;
  onToggle: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) => {
  const awaitingCount = tickets.filter((t) => t.statusName === "Open").length;
  const mostRecent = tickets[0];
  const fullName = getFullName(reg);

  return (
    <div data-testid={`support-ticket-group-${username}`}>
      <button
        onClick={onToggle}
        data-testid={`support-ticket-group-toggle-${username}`}
        className="flex items-center w-full gap-3 px-3.5 py-2.5 text-left transition-colors rounded-xl hover:bg-gray-50"
      >
        <div className={`relative flex items-center justify-center flex-shrink-0 w-9 h-9 text-xs font-bold uppercase rounded-full shadow-sm ${avatarColor(username)}`}>
          {username.slice(0, 2)}
          {awaitingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            {/* Name on top */}
            <p className="text-sm font-semibold text-gray-900 truncate">{fullName || username}</p>
            <span className="text-[10px] flex-shrink-0 text-gray-400">
              {formatBubbleTime(mostRecent.updateOn ?? mostRecent.insertOn)}
            </span>
          </div>
          {/* Username below, with the ticket count next to it */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[11px] text-gray-400 truncate">{username}</p>
            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
              {tickets.length}
            </span>
          </div>
        </div>

        {collapsed ? (
          <ChevronDown size={14} className="flex-shrink-0 text-gray-400" />
        ) : (
          <ChevronUp size={14} className="flex-shrink-0 text-gray-400" />
        )}
      </button>

      {!collapsed && (
        <div className="mt-0.5 ml-[1.125rem] space-y-1 border-l-2 border-gray-100 pl-3.5">
          {tickets.map((t) => (
            <TicketRow key={t.id} ticket={t} active={t.id === selectedId} onClick={() => onSelect(t.id)} variant="grouped" />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Main ────────────────────────────────────────────────────────────────── */

export default function AdminSupportPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [tickets, setTickets] = useState<SupportTicketResponse[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedDetail, setSelectedDetail] = useState<SupportTicketDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusOptions, setStatusOptions] = useState<LookupResponse[]>([]);
  const [selectedStatusId, setSelectedStatusId] = useState("");
  const [solution, setSolution] = useState("");
  const [sending, setSending] = useState(false);
  const [contextTab, setContextTab] = useState<"details" | "faq">("details");

  // Full name / mobile for each student, keyed by username (see StudentReg above).
  const [regByUsername, setRegByUsername] = useState<Record<string, StudentReg>>({});
  const fetchedUsernamesRef = useRef<Set<string>>(new Set());

  const loadTickets = () => {
    setTicketsLoading(true);
    getTickets()
      .then((data) => {
        setTickets(data);
        if (!selectedId && data.length) setSelectedId(data[0].id);
      })
      .finally(() => setTicketsLoading(false));
  };

  useEffect(() => {
    loadTickets();
    getLookupsByType(STATUS_LOOKUP_TYPE).then(setStatusOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch each student's full name / mobile (once per username) as tickets come in.
  useEffect(() => {
    const usernames = Array.from(new Set<string>(tickets.map((t) => t.username))).filter(Boolean);
    usernames.forEach((username) => {
      if (fetchedUsernamesRef.current.has(username)) return;
      fetchedUsernamesRef.current.add(username);
      getRegistrationByUsername(username)
        .then((reg) => {
          setRegByUsername((prev) => ({ ...prev, [username]: { name: reg?.name, mobile: reg?.mobile } }));
        })
        .catch(() => {
          // Leave it unset — getFullName/getMobile just render nothing for this student.
        });
    });
  }, [tickets]);

  useEffect(() => {
    if (!selectedId) { setSelectedDetail(null); return; }
    setDetailLoading(true);
    setSolution("");
    getTicketById(selectedId)
      .then((detail) => {
        setSelectedDetail(detail);
        setSelectedStatusId(detail.statusId);
      })
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const selectedTicket = selectedDetail;
  const isTicketClosed = selectedTicket?.statusName === "Closed";

  const statusNames = useMemo(
    () => statusOptions.map((s) => s.name).filter((name): name is string => typeof name === "string"),
    [statusOptions],
  );
  const tabs = ["All", ...statusNames];

  const counts = useMemo(() => {
    const base: Record<string, number> = { All: tickets.length };
    statusNames.forEach((s) => { base[s] = tickets.filter((t) => t.statusName === s).length; });
    return base;
  }, [tickets, statusNames]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const byTab = activeTab === "All" ? tickets : tickets.filter((t) => t.statusName === activeTab);
    if (!q) return byTab;
    return byTab.filter((t) =>
      t.username.toLowerCase().includes(q) ||
      t.ticketNo.toLowerCase().includes(q) ||
      t.issueName?.toLowerCase().includes(q)
    );
  }, [tickets, activeTab, search]);

  const openCount = counts["Open"] ?? 0;

  // Group the filtered tickets by student username, newest activity first —
  // both within a group and across groups — so a student with several
  // tickets shows up as one row in the list with their tickets nested under it.
  const groupedTickets = useMemo(() => {
    const byUsername = new Map<string, SupportTicketResponse[]>();
    filtered.forEach((t) => {
      const list = byUsername.get(t.username) ?? [];
      list.push(t);
      byUsername.set(t.username, list);
    });
    const activityOf = (t: SupportTicketResponse) => parseServerDate(t.updateOn ?? t.insertOn).getTime();
    return Array.from(byUsername.entries())
      .map(([username, group]) => ({
        username,
        tickets: [...group].sort((a, b) => activityOf(b) - activityOf(a)),
      }))
      .sort((a, b) => activityOf(b.tickets[0]) - activityOf(a.tickets[0]));
  }, [filtered]);

  const toggleGroup = (username: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    const updatedBy = getLoggedInUsername() || undefined;
    try {
      const updated = await updateTicketMessage(messageId, { message: newText, updatedBy });
      setSelectedDetail((prev) =>
        prev ? { ...prev, messages: prev.messages.map((m) => (m.id === messageId ? updated : m)) } : prev
      );
    } catch {
      // Backend call failed — still reflect the edit locally rather than silently reverting it.
      setSelectedDetail((prev) =>
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

  const handleSendResponse = async () => {
    if (!selectedId) return;
    setSending(true);
    try {
      const updated = await updateTicketStatus(selectedId, {
        statusId: selectedStatusId || selectedDetail?.statusId || "",
        solvedBy: getLoggedInUsername() || undefined,
        solution: solution.trim() || undefined,
      });
      setSelectedDetail(updated);
      setSolution("");
      loadTickets();
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout pageTitle="Support Management">
      <div
        className="flex flex-col h-full pb-4"
        style={{ zoom: 0.9 }}
      >
        {/* HEADER */}
        <div className="flex items-start justify-between flex-shrink-0 gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Support Management</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {openCount > 0
                ? `${openCount} open ticket${openCount > 1 ? "s" : ""} awaiting a response.`
                : "All caught up — no open tickets."}
            </p>
          </div>
          <button
            onClick={loadTickets}
            data-testid="support-refresh"
            className="inline-flex items-center gap-1.5 px-3 py-2 mt-0.5 text-xs font-semibold text-gray-600 transition-colors bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:text-gray-900"
          >
            <RefreshCw size={12} className={ticketsLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* CONSOLE: Tickets → Chat → Details/FAQ
            Fixed height (not flex-1/h-full) so the three columns hold a consistent
            height regardless of how much data each one has — adjust the calc()
            offset if your AppLayout header/footer height changes. */}
        <div className="flex gap-4 h-[calc(100vh-320px)] min-h-[480px]">

          {/* ── LIST COLUMN ── */}
          <div className={`${selectedTicket ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-[300px] flex-shrink-0 h-full min-h-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden`}>
            <div className="p-2.5 space-y-2 border-b border-gray-100 flex-shrink-0 bg-gray-50">
              <div className="relative">
                <Search size={13} className="absolute text-gray-500 -translate-y-1/2 pointer-events-none left-3 top-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, ID, or issue…"
                  data-testid="support-ticket-search"
                  className="w-full py-2 pl-8 pr-8 text-sm transition-all bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    data-testid="support-ticket-search-clear"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    data-testid={`support-tab-${tab}`}
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
                    <Inbox size={20} />
                  </div>
                  <p className="text-sm text-gray-400">
                    {search
                      ? `No tickets match "${search}".`
                      : activeTab === "All"
                        ? "No tickets yet."
                        : `No tickets with status "${activeTab}".`}
                  </p>
                </div>
              ) : (
                groupedTickets.map(({ username, tickets: groupTickets }) => (
                  <TicketGroup
                    key={username}
                    username={username}
                    tickets={groupTickets}
                    reg={regByUsername[username]}
                    collapsed={collapsedGroups.has(username)}
                    onToggle={() => toggleGroup(username)}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                ))
              )}
            </div>

            {filtered.length > 0 && (
              <p className="px-3 py-2 text-[11px] text-right text-gray-400 border-t border-gray-100 flex-shrink-0">
                {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
                {search ? ` matching "${search}"` : activeTab !== "All" ? ` in ${activeTab}` : " total"}
              </p>
            )}
          </div>

          {/* ── CHAT PANE ── */}
          <div className={`${selectedTicket ? "flex" : "hidden lg:flex"} flex-col flex-1 h-full min-h-0 min-w-0 overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl`}>
            {detailLoading ? (
              <div className="flex items-center justify-center flex-1 text-gray-400">
                <Loader2 size={22} className="animate-spin" />
              </div>
            ) : !selectedTicket ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 bg-gradient-to-br from-white to-gray-50">
                <div className="flex items-center justify-center text-gray-300 bg-gray-100 rounded-full w-14 h-14">
                  <MessageSquare size={22} />
                </div>
                <p className="text-sm text-gray-500">Select a conversation to view details.</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center flex-shrink-0 gap-3 px-4 py-3 border-b border-gray-100">
                  <button
                    onClick={() => setSelectedId(null)}
                    data-testid="support-chat-back"
                    className="flex-shrink-0 text-gray-400 lg:hidden hover:text-gray-700"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className={`flex items-center justify-center flex-shrink-0 w-9 h-9 text-xs font-bold uppercase rounded-full ${avatarColor(selectedTicket.username)}`}>
                    {selectedTicket.username.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {getFullName(regByUsername[selectedTicket.username]) || selectedTicket.username}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {selectedTicket.username}
                      {getMobile(regByUsername[selectedTicket.username]) && (
                        <>
                          <span className="mx-1.5 text-gray-300">·</span>
                          {getMobile(regByUsername[selectedTicket.username])}
                        </>
                      )}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400">{selectedTicket.ticketNo}</p>
                  </div>
                  <StatusBadge status={selectedTicket.statusName} testId="support-chat-status" />
                </div>

                {/* Messages */}
                <div
                  className="flex-1 min-h-0 px-4 py-3 space-y-2 overflow-y-auto hover-scrollbar bg-[#eef2ec]"
                  style={chatWallpaperStyle}
                >
                  {selectedTicket.messages.length === 0 ? (
                    <p className="py-6 text-sm text-center text-gray-400">No messages yet.</p>
                  ) : (
                    [...selectedTicket.messages]
                      .sort((a, b) => parseServerDate(a.insertOn).getTime() - parseServerDate(b.insertOn).getTime())
                      .map((m) => (
                        <ChatBubble
                          key={m.id}
                          mine={m.senderType === "admin"}
                          label={m.senderType === "admin" ? `You${m.senderName ? ` · ${m.senderName}` : ""}` : selectedTicket.username}
                          text={m.message}
                          time={formatBubbleTime(m.insertOn)}
                          ticks={m.senderType === "admin" ? "sent" : undefined}
                          avatar={m.senderType === "student" ? { initials: selectedTicket.username.slice(0, 2), colorClass: avatarColor(selectedTicket.username) } : undefined}
                          editable={m.senderType === "admin"}
                          edited={!!m.updateOn}
                          editedTooltip={m.updatedBy ? `Edited by ${m.updatedBy}` : undefined}
                          onSave={(newText) => handleEditMessage(m.id, newText)}
                        />
                      ))
                  )}

                  {!selectedTicket.messages.some((m) => m.senderType === "admin") && (
                    <div className="flex justify-center py-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-amber-700 bg-amber-500/15 border border-amber-700/30 rounded-full">
                        <Clock size={11} /> Awaiting your response
                      </span>
                    </div>
                  )}
                </div>

                {/* Composer */}
                <div className="flex-shrink-0 p-3 space-y-2 border-t border-gray-100">
                  {isTicketClosed ? (
                    <p className="py-1.5 text-xs text-center text-gray-500" data-testid="support-chat-closed-note">
                      This conversation is closed. The student will need to raise a new ticket to continue.
                    </p>
                  ) : (
                    <MessageComposer
                      value={solution}
                      onChange={setSolution}
                      onSend={handleSendResponse}
                      sending={sending}
                      placeholder="Type a clear, helpful response to the student…"
                      inputTestId="support-response-input"
                      sendTestId="support-send-response-inline"
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── CONTEXT PANE (Details / FAQs) — always visible, whether or not a ticket is selected ── */}
          <div className={`${selectedTicket ? "flex" : "hidden lg:flex"} w-full lg:w-[300px] flex-shrink-0 h-full min-h-0 overflow-hidden flex-col bg-white border border-gray-200 shadow-sm rounded-2xl`}>
            {/* TAB BUTTONS */}
            <div className="flex flex-shrink-0 gap-1 p-1 m-3 border rounded-2xl bg-slate-100 border-slate-200">
              {CONTEXT_TABS.map(({ key, label, icon: Icon }) => {
                const active = contextTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    data-testid={`support-context-tab-${key}`}
                    onClick={() => setContextTab(key)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${active
                      ? "bg-white text-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* CONTENT — scrolls as one unit for Details; FAQ list scrolls internally within its own capped area */}
            <div className="flex-1 p-4 overflow-y-auto hover-scrollbar">
              {contextTab === "details" ? (
                selectedTicket ? (
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold tracking-wide text-gray-400 uppercase">Ticket Details</p>
                    <div className="space-y-2.5 text-sm">
                      {getFullName(regByUsername[selectedTicket.username]) && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <UserIcon size={13} className="flex-shrink-0 text-gray-400" />
                          <span className="truncate">{getFullName(regByUsername[selectedTicket.username])}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <UserIcon size={13} className="flex-shrink-0 text-gray-400" />
                        <span className="truncate">{selectedTicket.username}</span>
                      </div>
                      {getMobile(regByUsername[selectedTicket.username]) && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone size={13} className="flex-shrink-0 text-gray-400" />
                          <span className="truncate">{getMobile(regByUsername[selectedTicket.username])}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Tag size={13} className="flex-shrink-0 text-gray-400" />
                        <span className="truncate">{selectedTicket.issueName ?? "General"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={13} className="flex-shrink-0 text-gray-400" />
                        <span>Submitted {formatDate(selectedTicket.insertOn)}</span>
                      </div>
                      {selectedTicket.updateOn && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock size={13} className="flex-shrink-0 text-gray-400" />
                          <span>Updated {formatDate(selectedTicket.updateOn)}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 space-y-3 border-t border-gray-100">
                      <p className="text-[11px] font-bold tracking-wide text-gray-400 uppercase">Resolution</p>
                      <div className="flex flex-wrap gap-1.5">
                        {statusOptions.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedStatusId(s.id)}
                            data-testid={`support-status-option-${s.name}`}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${selectedStatusId === s.id
                              ? `text-white border-transparent ${scfg(s.name ?? undefined).solid}`
                              : "bg-white text-gray-500 border-gray-200 hover:text-gray-700"
                              }`}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                      {selectedTicket.solvedBy && (
                        <p className="text-xs text-gray-500">
                          Last resolved by <span className="font-semibold text-gray-700">{selectedTicket.solvedBy}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg bg-gray-50">
                        <UserIcon size={13} className="flex-shrink-0 text-gray-400" />
                        <span className="truncate">
                          Resolving as{" "}
                          <span className="font-semibold text-gray-800">
                            {getLoggedInUsername() || "Unknown user"}
                          </span>
                        </span>
                      </div>
                      <button
                        onClick={handleSendResponse}
                        disabled={sending}
                        data-testid="support-send-response"
                        className="w-full px-4 py-2 text-sm font-semibold text-white transition-colors rounded-lg shadow-sm bg-primary hover:bg-primary/90 disabled:opacity-50"
                      >
                        {sending ? "Sending…" : "Send Response"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <Info size={18} className="text-gray-300" />
                    <p className="text-xs text-gray-400">Select a conversation to see ticket details.</p>
                  </div>
                )
              ) : (
                <FAQSidePanel />
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}