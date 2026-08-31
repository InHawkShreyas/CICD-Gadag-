import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search, CheckCircle, Printer, RefreshCw, Receipt, Eye, AlertCircle, IndianRupee,
  ChevronDown, ChevronRight, Globe,
} from "lucide-react";
import Barcode from "react-barcode";
import AppLayout from "../../components/layouts/AppLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Toast from "../../components/ui/Toast";
import Loader from "../../components/ui/Loader";
import Pagination from "../../components/ui/Pagination";
import { getFullApplicationByAppNo } from "../../services/applicationQueryService";
import { getCourseDetailsByApplicationId } from "../../services/applicationCourseDetailService";
import { getDegreeById } from "../../services/degreeService";
import { getCourseById } from "../../services/courseService";
import { getLookupsByType } from "../../services/lookupService";
import { getAcademicYears } from "../../services/academicYearService";
import {
  getFeeByFilters,
  type AdmissionFeeStructure,
  type AdmissionFeeStructureDetail,
} from "../../services/admissionFeeStructureService";
import { generateReceiptNumber } from "../../services/receiptSequenceService";
import {
  createFeeCollectionManual,
  getAllFeeCollectionManualsPaged,
  getFeeCollectionManualByAppNo,
  type FeeCollectionManualResponseDto,
} from "../../services/feecollectionmanualService";
import {
  getPagedFeeCollections,
  type FeeCollectionResponse,
} from "../../services/feeCollectionService";

/* ─── Types ────────────────────────────────────────────────── */

type PaymentType = "full" | "installment1" | "installment2";

type ParticularSelection = {
  checked: boolean;
  amountInput: string;
};

type StudentInfo = {
  applicationId: string;
  appNo: string;
  name: string;
  phone: string;
  email: string;
  category: string;
  degreeName: string;
  courseName: string;
  degreeId: string;
  courseId: string;
  categoryId: string;
  batchDesc?: string;
  batchYear?: string;
};

/** One row per application in the grouped Receipt History table — mirrors
 * the FeeGroup pattern on the Fee Collection page (group offline receipts
 * by application no. / student, expand to see each individual receipt). */
type ManualReceiptGroup = {
  key: string;
  appNo: string;
  applicationId?: string;
  studentName: string;
  records: FeeCollectionManualResponseDto[];
  totalPaid: number;
  latestPaymentDate?: string;
};

/** A single row in the "Previous Payments" panel — offline (manual) and
 * online payments normalized to a common shape so they can be traced
 * together for a given application. */
type PreviousPayment = {
  key: string;
  source: "offline" | "online";
  feeType: string;
  amount: number;
  date?: string;
  reference: string;
  status?: string;
};

/* ─── Constants ────────────────────────────────────────────── */

const FEE_NAME: Record<PaymentType, string> = {
  full: "Admission Fee",
  installment1: "Admission Fee - Installment 1",
  installment2: "Admission Fee - Installment 2",
};

const PAYMENT_LABEL: Record<PaymentType, string> = {
  full: "Full Payment",
  installment1: "Installment 1",
  installment2: "Installment 2",
};

const HISTORY_PAGE_SIZE = 10;

const EDITABLE_PARTICULARS = ["tuition", "library", "lab"];

const YEAR_COLOR_PALETTE = [
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
];

// Deterministic color per academic-year label, based on a hash of the label
// itself rather than "order first seen" — needed since year data now fills
// in progressively per history page instead of arriving all at once.
function colorForYear(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return YEAR_COLOR_PALETTE[hash % YEAR_COLOR_PALETTE.length];
}

function isEditableParticular(name?: string | null): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return EDITABLE_PARTICULARS.some((p) => n.includes(p));
}

// Mirrors the status-badge palette on the Fee Collection page, so a payment's
// status reads the same way whether it's seen there or here.
const STATUS_BADGE: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  refund: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
};
const statusBadgeClass = (status?: string) =>
  STATUS_BADGE[(status ?? "").toLowerCase()] ?? "bg-gray-100 text-gray-600";

/* ─── Helpers ──────────────────────────────────────────────── */

function detailKey(d: AdmissionFeeStructureDetail, i: number): string {
  return d.id ?? String(i);
}

// Rounds to the nearest paisa (2 decimals) — every particular-level money
// calculation below (collected totals, remaining balances) goes through
// this, otherwise plain JS floating-point subtraction/addition on rupee
// amounts drifts by a fraction of a paisa (e.g. 5000 - 4999.99 rendering as
// 0.010000000000047748) and shows up as odd decimals in the UI.
function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Total already collected for a fee particular, keyed by normalized
// particular name, summed from every previous Full Payment receipt's
// per-particular breakdown (receipt.details). Installment 1/2 receipts are
// excluded — this map only feeds the Full Payment particulars table.
function buildParticularHistory(
  receipts: FeeCollectionManualResponseDto[]
): Map<string, number> {
  const map = new Map<string, number>();
  receipts
    .filter((r) => r.feeName === FEE_NAME.full)
    .forEach((r) => {
      (r.details ?? []).forEach((d) => {
        const key = (d.particularName ?? "").trim().toLowerCase();
        if (!key) return;
        map.set(key, roundMoney((map.get(key) ?? 0) + (d.particularAmt ?? 0)));
      });
    });
  return map;
}

function buildSelections(
  type: PaymentType,
  details: AdmissionFeeStructureDetail[],
  // Only meaningful for "full" — see buildParticularHistory. A particular
  // that's already fully collected (remaining <= 0) is done — left
  // unchecked so it can't be selected again, whether it's editable or not.
  // A particular with something collected but a balance still owed (this
  // happens even for fixed particulars, since a partial Full Payment scales
  // every selected particular's amount proportionally, not just the
  // editable ones) stays selectable, defaulted to what's still remaining —
  // not the full sticker amount, and not the amount collected last time —
  // so the sum of what's checked lines up with what's actually still due.
  particularHistory?: Map<string, number>
): Record<string, ParticularSelection> {
  const result: Record<string, ParticularSelection> = {};
  details.forEach((d, i) => {
    const key = detailKey(d, i);

    const baseAmt =
      type === "installment1"
        ? (d.installment1Amount && d.installment1Amount > 0 ? d.installment1Amount : (d.amount ?? 0))
        : type === "installment2"
          ? (d.installment2Amount && d.installment2Amount > 0 ? d.installment2Amount : (d.amount ?? 0))
          : (d.amount ?? 0);

    if (type === "full" && particularHistory) {
      const collected = particularHistory.get((d.particularName ?? "").trim().toLowerCase()) ?? 0;
      if (collected > 0) {
        const remaining = roundMoney(Math.max(baseAmt - collected, 0));
        result[key] = remaining > 0.01
          ? { checked: true, amountInput: String(remaining) }
          : { checked: false, amountInput: "" };
        return;
      }
    }

    const checked =
      type === "full"
        ? true
        : type === "installment1"
          ? (d.installment1 ?? false)
          : (d.installment2 ?? false);

    result[key] = { checked, amountInput: baseAmt > 0 ? String(baseAmt) : "" };
  });
  return result;
}

function groupManualReceipts(
  records: FeeCollectionManualResponseDto[],
  infoByAppNo: Map<string, { studentName?: string }>
): ManualReceiptGroup[] {
  const groups = new Map<string, ManualReceiptGroup>();

  for (const r of records) {
    const key = r.appNo || `manual-${r.id}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        appNo: r.appNo ?? "—",
        applicationId: r.appId,
        studentName: (r.appNo && infoByAppNo.get(r.appNo)?.studentName) || "—",
        records: [],
        totalPaid: 0,
        latestPaymentDate: undefined,
      };
      groups.set(key, group);
    }

    group.records.push(r);
    group.totalPaid = roundMoney(group.totalPaid + (r.feeAmount ?? 0));
    if (r.paymentDate && (!group.latestPaymentDate || r.paymentDate > group.latestPaymentDate)) {
      group.latestPaymentDate = r.paymentDate;
    }
  }

  // Most recent activity first
  return [...groups.values()].sort((a, b) =>
    (b.latestPaymentDate ?? "").localeCompare(a.latestPaymentDate ?? "")
  );
}

function validateTransactionId(value: string): string | null {
  const v = value.trim();
  if (!v) return "Transaction / Reference Number is required.";
  if (v.length < 3) return "Transaction / Reference Number looks too short.";
  if (v.length > 60) return "Transaction / Reference Number is too long.";
  if (!/[a-zA-Z0-9]/.test(v)) return "Enter a valid transaction / reference number.";
  return null;
}

// Case/whitespace-insensitive so "utr123", "UTR123 ", and " utr123" don't
// slip past the duplicate check as if they were distinct values.
function normalizeTransactionId(value: string): string {
  return value.trim().toLowerCase();
}

function validateAppNo(value: string): string | null {
  const v = value.trim();
  if (!v) return "Please enter an application number.";
  if (v.length < 4) return "Application number looks too short.";
  return null;
}

/**
 * Whether the late fine on a fee structure has actually kicked in *today*.
 * Mirrors the same check used on the Fee Structure page, so a fine that has
 * become active since the structure was last saved is reflected here too.
 */
function isFineActive(endDate: string | null | undefined): boolean {
  if (!endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  if (Number.isNaN(end.getTime())) return false;
  return today.getTime() >= end.getTime();
}

/* ─── Component ────────────────────────────────────────────── */

export default function ReceiptEntryPage() {
  /* ── Modal state ────────────────────────────────────────── */
  const [addModalOpen, setAddModalOpen] = useState(false);

  /* search */
  const [appNoInput, setAppNoInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [appNoError, setAppNoError] = useState<string | null>(null);

  /* loaded data */
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [feeStructure, setFeeStructure] = useState<AdmissionFeeStructure | null>(null);
  const [existingReceipts, setExistingReceipts] = useState<FeeCollectionManualResponseDto[]>([]);
  // Whether Document Verification has approved installment payment for THIS
  // student (ApplicationVerification.installment). Comes from the same
  // getFullApplicationByAppNo(appNo) call already made in handleSearch —
  // no extra request needed. Installment 1 / 2 are only offered here when
  // this is true; otherwise only Full Payment is shown.
  const [installmentApproved, setInstallmentApproved] = useState(false);

  /* previous payments — online (gateway) side, for the traceability panel.
     Offline/manual previous payments already live in existingReceipts. */
  const [onlinePayments, setOnlinePayments] = useState<FeeCollectionResponse[]>([]);
  const [onlinePaymentsLoading, setOnlinePaymentsLoading] = useState(false);

  /* payment form */
  const [paymentType, setPaymentType] = useState<PaymentType>("full");
  const [paymentMode, setPaymentMode] = useState("DD");
  const [transactionId, setTransactionId] = useState("");
  const [transactionTouched, setTransactionTouched] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [particularSelections, setParticularSelections] = useState<Record<string, ParticularSelection>>({});
  const [submitting, setSubmitting] = useState(false);

  /* receipt */
  const [generated, setGenerated] = useState<FeeCollectionManualResponseDto | null>(null);

  /* history */
  const [allReceipts, setAllReceipts] = useState<FeeCollectionManualResponseDto[]>([]);
  const [appNoYearMap, setAppNoYearMap] = useState<Map<string, { academicYearDesc: string; batchYearLabel: string | null; studentName?: string }>>(new Map());
  const [expandedHistoryKeys, setExpandedHistoryKeys] = useState<Set<string>>(new Set());
  const [historySearch, setHistorySearch] = useState("");
  const [, setViewStudentInfo] = useState<StudentInfo | null>(null);
  const [, setViewStudentLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);

  /* toast */
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* ── Load all receipts on mount — this is the ONLY thing the history
     spinner waits on now. Academic Year / Batch Year columns are
     enrichment: they render as "—" until their data lands, then fill in
     in place (see the effect below). Don't gate the table on them. ── */
  useEffect(() => {
    let cancelled = false;
    getAllFeeCollectionManualsPaged()
      .then((receipts) => {
        if (cancelled) return;
        setAllReceipts(receipts);
      })
      .catch(() => showToast("Could not load receipt history.", "error"))
      .finally(() => {
        if (cancelled) return;
        setHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [showToast]);

  /* ── Filtered + paginated history ────────────────────────── */
  const filteredHistory = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    return allReceipts.filter((r) =>
      !q ||
      (r.receiptNo ?? "").toLowerCase().includes(q) ||
      (r.appNo ?? "").toLowerCase().includes(q) ||
      (r.feeName ?? "").toLowerCase().includes(q) ||
      (r.transactionId ?? "").toLowerCase().includes(q)
    );
  }, [allReceipts, historySearch]);

  useEffect(() => { setHistoryPage(1); setExpandedHistoryKeys(new Set()); }, [historySearch]);

  // Deterministic color per label (hash-based, see colorForYear) rather than
  // "order first seen" — year data now fills in progressively per page
  // instead of arriving all at once, so order-of-first-sight isn't stable.
  const yearColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [, info] of appNoYearMap) {
      const label = info.academicYearDesc;
      if (label && !map.has(label)) map.set(label, colorForYear(label));
    }
    return map;
  }, [appNoYearMap]);

  // Group matching receipts by application no. / student — mirrors the Fee
  // Collection page, where one application can have several receipts
  // (installments, retries, etc.) that read better as one expandable row.
  const groupedAllHistory = useMemo(
    () => groupManualReceipts(filteredHistory, appNoYearMap),
    [filteredHistory, appNoYearMap]
  );

  const historyTotalPages = Math.max(1, Math.ceil(groupedAllHistory.length / HISTORY_PAGE_SIZE));
  const safeHistoryPage = Math.min(historyPage, historyTotalPages);
  const pagedGroups = useMemo(() => {
    const start = (safeHistoryPage - 1) * HISTORY_PAGE_SIZE;
    return groupedAllHistory.slice(start, start + HISTORY_PAGE_SIZE);
  }, [groupedAllHistory, safeHistoryPage]);

  const toggleHistoryGroup = useCallback((key: string) => {
    setExpandedHistoryKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  /* ── Academic Year / Batch Year / Student Name enrichment — scoped to
     ONLY the application groups on the current history page (bounded to
     HISTORY_PAGE_SIZE, run in parallel), instead of the old
     filterApplications({}) + getAllApplicationCourseDetails() pair, which
     each fetched every application/course-detail row in the system just to
     label one page of 10 groups. That system-wide pair — refetched on
     every search keystroke and every page turn — was the actual reason
     this page kept spinning. Scoping it to the visible page fixes that;
     columns render "—" until this fills in. ── */
  useEffect(() => {
    const appNos = [...new Set(pagedGroups.map((g) => g.appNo).filter((n): n is string => !!n && n !== "—"))];
    const appIds = [...new Set(pagedGroups.map((g) => g.applicationId).filter((id): id is string => !!id))];
    if (appNos.length === 0 || appIds.length === 0) return;

    let cancelled = false;
    Promise.all([
      getAcademicYears().catch(() => []),
      Promise.all(appIds.map((id) => getCourseDetailsByApplicationId(id).catch(() => []))),
      Promise.all(appNos.map((appNo) => getFullApplicationByAppNo(appNo).catch(() => null))),
    ])
      .then(([academicYears, courseDetailResults, applicationResults]) => {
        if (cancelled) return;
        const courseDetails = courseDetailResults.flat() as { applicationId?: string; batchId?: string; acceptedYn?: boolean }[];
        // An application can have multiple course-detail rows (one per
        // applied preference). Building the map directly from the flat
        // array lets whichever row happens to come last for a given
        // applicationId silently win, rather than the one actually
        // confirmed. Prefer the row marked acceptedYn; fall back to the
        // first row seen only if none is marked.
        const batchIdByAppId = new Map<string, string | undefined>();
        for (const cd of courseDetails) {
          if (!cd.applicationId) continue;
          if (cd.acceptedYn || !batchIdByAppId.has(cd.applicationId)) {
            batchIdByAppId.set(cd.applicationId, cd.batchId);
          }
        }
        const academicYearIdByAppId = new Map(
          applicationResults
            .filter((r): r is NonNullable<typeof r> => !!r?.application)
            .map((r) => [r.application.id, r.application.academicYearId])
        );
        // applicationResults is index-aligned with appNos (Promise.all
        // preserves call order), so we can read the student name straight
        // off it without a second lookup pass.
        const nameByAppNo = new Map<string, string>();
        appNos.forEach((appNo, idx) => {
          const name = applicationResults[idx]?.application?.name;
          if (name) nameByAppNo.set(appNo, name);
        });

        setAppNoYearMap((prev) => {
          const next = new Map(prev);
          for (const g of pagedGroups) {
            if (!g.appNo || g.appNo === "—" || !g.applicationId) continue;
            const batchId = batchIdByAppId.get(g.applicationId);
            const batchMatch = batchId ? academicYears.find((y) => y.id === batchId) : undefined;
            const currentAcademicYearId = academicYearIdByAppId.get(g.applicationId);
            const currentYearMatch = currentAcademicYearId
              ? academicYears.find((y) => y.id === currentAcademicYearId)
              : undefined;
            const existing = next.get(g.appNo);
            const desc = currentYearMatch?.description ?? existing?.academicYearDesc ?? "";
            const batchYearValue = batchMatch?.batchYear ?? currentYearMatch?.batchYear;
            next.set(g.appNo, {
              academicYearDesc: desc,
              batchYearLabel: batchYearValue ? `${batchYearValue}` : (existing?.batchYearLabel ?? null),
              studentName: nameByAppNo.get(g.appNo) ?? existing?.studentName,
            });
          }
          return next;
        });
      })
      .catch(console.error);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagedGroups]);

  /* ── Derived amounts ─────────────────────────────────────── */
  const details = feeStructure?.details ?? [];
  // Raw sum of fee particulars (the "sticker price" before any deduction/fine).
  const feeSubtotal = roundMoney(feeStructure?.totalAmount ?? details.reduce((s, d) => s + (d.amount ?? 0), 0));
  const feeDeduction = feeStructure?.deductionYn ? (feeStructure.deductionAmount ?? 0) : 0;
  const feeFineActive = isFineActive(feeStructure?.endDate);
  const feeFine = feeFineActive ? (feeStructure?.fineAmount ?? 0) : 0;
  // fullAmt = what this student is actually configured to pay for Full Payment —
  // subtotal minus any deduction, plus the late fine if it's currently active —
  // i.e. the same "Pay Amount" shown for this record on the Fee Structure page,
  // not just the raw total of fee particulars.
  const fullAmt = roundMoney(feeSubtotal - feeDeduction + feeFine);

  const installmentAmountToPay = roundMoney(
    Object.values(particularSelections)
      .filter((s) => s.checked)
      .reduce((sum, s) => sum + (parseFloat(s.amountInput) || 0), 0)
  );

  // Full due amount for a payment type, independent of the current
  // particular-selection edit state — used to know how much is still owed,
  // not just whether a receipt exists.
  const dueFor = (type: PaymentType): number => {
    if (type === "full") return fullAmt;
    const flag = type === "installment1" ? "installment1" : "installment2";
    const amountField = type === "installment1" ? "installment1Amount" : "installment2Amount";
    return roundMoney(details.reduce((sum, d) => {
      if (!d[flag]) return sum;
      const amt = d[amountField] && d[amountField]! > 0 ? d[amountField]! : (d.amount ?? 0);
      return sum + amt;
    }, 0));
  };

  // Total already collected for a payment type across every receipt
  // generated so far (there can be more than one, if earlier receipts were
  // partial) — combining offline (manual) AND online (gateway) payments, so
  // a student who paid part online and part over the counter isn't charged
  // for the online part again. Online payments only ever cover the
  // admission fee as one lump sum via the gateway — there's no online
  // equivalent of "Installment 1/2" — so an online SUCCESS payment only
  // offsets the "full" payment type. If your gateway does support online
  // installments, this matching needs to key off the online record's own
  // fee-type label instead.
  const paidFor = (type: PaymentType): number => {
    const offline = existingReceipts
      .filter((r) => r.feeName === FEE_NAME[type])
      .reduce((sum, r) => sum + (r.feeAmount ?? 0), 0);

    const online = type === "full"
      ? onlinePayments
        .filter((r) => (r.status ?? "").toUpperCase() === "SUCCESS" && (r.feeType ?? "").toLowerCase().includes("admission"))
        .reduce((sum, r) => sum + (r.paidAmount ?? r.amount ?? 0), 0)
      : 0;

    return roundMoney(offline + online);
  };

  const remainingFor = (type: PaymentType): number => roundMoney(Math.max(dueFor(type) - paidFor(type), 0));

  // Per-particular "already collected" totals for Full Payment, derived
  // from existingReceipts (recomputes on every new search and after every
  // receipt generated). Used to lock out fixed particulars that are done
  // and to prefill editable particulars with their last collected amount.
  const particularHistory = useMemo(() => buildParticularHistory(existingReceipts), [existingReceipts]);
  const collectedForParticular = (name?: string | null): number =>
    particularHistory.get((name ?? "").trim().toLowerCase()) ?? 0;

  // Fully paid only once the collected total meets the due amount — a
  // single partial receipt no longer counts as "done".
  const isFullyPaid = (type: PaymentType): boolean => dueFor(type) > 0 && remainingFor(type) <= 0;
  const isPartiallyPaid = (type: PaymentType): boolean => !isFullyPaid(type) && paidFor(type) > 0;

  // Kept as the gating check used around the page (renamed meaning: now
  // "nothing more can be collected for this type", not "a receipt exists").
  const alreadyPaid = (type: PaymentType) => isFullyPaid(type);

  // Only offer Installment 1 / 2 once Document Verification has approved
  // installments for this student; otherwise Full Payment is the only option.
  const visiblePaymentTypes: PaymentType[] = installmentApproved
    ? ["full", "installment1", "installment2"]
    : ["full"];

  // "Full Payment" collects only what's actually still owed — if part of
  // the admission fee already came in online, this is fullAmt minus that,
  // not the original sticker amount all over again. Partial collection for
  // Full Payment now goes entirely through the per-particular Amount fields
  // in fullParticularsTable (tuition/library/lab are individually editable,
  // same mechanism as the installment table) rather than a separate
  // free-typed lump-sum field — so amountToPay is always just the sum of
  // whatever's currently checked/entered in particularSelections, for
  // either payment type. Once installments are approved those per-particular
  // fields lock (see fullParticularsTable), so Full Payment goes back to
  // being a fixed amount — Installment 1/2 become the mechanism for partial
  // collection instead.
  const amountToPay = installmentAmountToPay;

  // Offline (manual) + online (gateway) payments for the searched
  // application, normalized into one list so every SUCCESSFUL admission-fee
  // payment — however it was collected — can be traced in one place. Online
  // records are filtered to admission-fee only (same test paidFor uses) AND
  // to status SUCCESS, so a failed/pending gateway attempt (or an Application
  // Fee payment, which belongs to a separate, earlier step) doesn't show up
  // in what's meant to be a record of actual admission-fee payments here.
  const previousPayments: PreviousPayment[] = useMemo(() => {
    const offline: PreviousPayment[] = existingReceipts.map((r) => ({
      key: `off-${r.id}`,
      source: "offline",
      feeType: r.feeName ?? "—",
      amount: r.feeAmount ?? 0,
      date: r.paymentDate,
      reference: r.receiptNo ?? "—",
      status: "SUCCESS",
    }));
    const online: PreviousPayment[] = onlinePayments
      .filter(
        (r) =>
          (r.feeType ?? "").toLowerCase().includes("admission") &&
          (r.status ?? "").toUpperCase() === "SUCCESS"
      )
      .map((r) => ({
        key: `on-${r.id}`,
        source: "online",
        feeType: r.feeType ?? "—",
        amount: r.paidAmount ?? r.amount ?? 0,
        date: r.paymentDate,
        reference: r.receiptNumber ?? r.transactionId ?? "—",
        status: r.status ?? "—",
      }));
    return [...offline, ...online].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [existingReceipts, onlinePayments]);

  // ── Duplicate transaction-number detection ──────────────────────────
  // allReceipts already holds every receipt ever generated (loaded once on
  // mount, appended to on every new receipt), so we can cross-check the
  // number the admin is typing against the full history without another
  // network call. Matched on same paymentMode + normalized transactionId.
  //
  // NOTE: this is a UX safety net, not the actual fraud control — it only
  // catches what's in the browser's already-loaded list. Two admins
  // entering the same number in the same few seconds (before either page
  // has the other's receipt), or a request replayed straight against the
  // API, would both sail past this. The real fix has to be a uniqueness
  // constraint enforced server-side.
  const transactionDuplicate = useMemo(() => {
    const norm = normalizeTransactionId(transactionId);
    if (!norm) return null;
    return (
      allReceipts.find(
        (r) =>
          normalizeTransactionId(r.transactionId ?? "") === norm &&
          (r.paymentMode ?? "").toLowerCase() === paymentMode.toLowerCase()
      ) ?? null
    );
  }, [transactionId, allReceipts, paymentMode]);

  // Same number reused for a DIFFERENT student = the fraud pattern this
  // exists to catch — hard block, can't be overridden from this screen.
  const transactionUsedByOtherStudent =
    !!transactionDuplicate && !!student && transactionDuplicate.appNo !== student.appNo;

  // Same number reused for the SAME student can be legitimate (e.g. one DD
  // covering both installments, entered as two receipts) — warn, don't block.
  const transactionReusedBySameStudent =
    !!transactionDuplicate && !!student && transactionDuplicate.appNo === student.appNo;

  const transactionError = transactionTouched
    ? (validateTransactionId(transactionId) ??
      (transactionUsedByOtherStudent
        ? `This transaction number is already on receipt ${transactionDuplicate?.receiptNo ?? "—"} for application ${transactionDuplicate?.appNo ?? "—"}. Verify the receipt with the student before proceeding.`
        : null))
    : null;

  const generateDisabledReason = (): string | null => {
    if (alreadyPaid(paymentType)) {
      return `${PAYMENT_LABEL[paymentType]} has already been fully paid for this application.`;
    }
    const txErr = validateTransactionId(transactionId);
    if (txErr) return txErr;
    if (transactionUsedByOtherStudent) {
      return `This transaction number was already used for application ${transactionDuplicate?.appNo ?? "—"} (receipt ${transactionDuplicate?.receiptNo ?? "—"}).`;
    }
    if (amountToPay <= 0) {
      return paymentType === "full"
        ? "No fee amount found for this application's fee structure."
        : "Select at least one fee particular with a valid amount for this installment.";
    }
    const remaining = remainingFor(paymentType);
    if (remaining > 0 && amountToPay > remaining) {
      return `Only ₹${remaining.toLocaleString("en-IN")} remains for ${PAYMENT_LABEL[paymentType]} — reduce the amount.`;
    }
    return null;
  };

  /* ── Payment type change ─────────────────────────────────── */
  const handlePaymentTypeChange = (type: PaymentType) => {
    if (type !== "full" && !installmentApproved) return;
    if (alreadyPaid(type)) return;
    setPaymentType(type);
    setParticularSelections(buildSelections(type, details, type === "full" ? particularHistory : undefined));
  };

  const toggleParticular = (key: string, checked: boolean) =>
    setParticularSelections((prev) => ({ ...prev, [key]: { ...prev[key], checked } }));

  const updateParticularAmount = (key: string, amountInput: string) =>
    setParticularSelections((prev) => ({ ...prev, [key]: { ...prev[key], amountInput } }));

  // Bulk check/uncheck every fee particular in one go — used by the
  // "Select all" / "Unselect all" controls on the Full Payment table.
  // Skips particulars that are already fully collected — those stay
  // unchecked no matter what "Select all" is clicked.
  const setAllParticularsChecked = (checked: boolean) =>
    setParticularSelections((prev) => {
      const next = { ...prev };
      details.forEach((d, i) => {
        const key = detailKey(d, i);
        const remaining = roundMoney(Math.max((d.amount ?? 0) - collectedForParticular(d.particularName), 0));
        if (remaining <= 0.01 && collectedForParticular(d.particularName) > 0) return;
        next[key] = { ...(next[key] ?? { checked, amountInput: "" }), checked };
      });
      return next;
    });

  /* ── Search ──────────────────────────────────────────────── */
  const handleSearch = async () => {
    const appNo = appNoInput.trim();
    const err = validateAppNo(appNo);
    if (err) { setAppNoError(err); showToast(err, "error"); return; }
    setAppNoError(null);
    setSearching(true);
    setStudent(null);
    setFeeStructure(null);
    setExistingReceipts([]);
    setOnlinePayments([]);
    setInstallmentApproved(false);
    setGenerated(null);
    setPaymentType("full");
    setPaymentMode("DD");
    setTransactionId("");
    setTransactionTouched(false);
    setOrderId("");
    setParticularSelections({});

    try {
      const [fullResult, categories, academicYears] = await Promise.all([
        getFullApplicationByAppNo(appNo),
        getLookupsByType("Category", ""),
        getAcademicYears().catch(() => []),
      ]);
      const app = fullResult?.application;
      if (!app?.id) { showToast(`No application found for "${appNo}".`, "error"); setSearching(false); return; }

      // Same "installment" flag Document Verification toggles via
      // Approve/Remove Installment — this is the single source of truth
      // for whether this student may pay in installments here.
      const verif = (fullResult as { verification?: { installment?: boolean } | null })?.verification ?? null;
      setInstallmentApproved(!!verif?.installment);

      const categoryName = categories.find((c) => c.id === app.categoryId)?.name ?? "—";
      const gmCatId = categories.find((c) => c.name?.toUpperCase() === "GM")?.id ?? "";
      const effectiveCategoryId = app.categoryId || gmCatId;

      type CourseDetail = { degreeId: string; courseId: string; batchId?: string; acceptedYn?: boolean };
      const courseDetails = (fullResult.courseDetails ?? []) as CourseDetail[];

      let degreeName = "—", courseName = "—", degreeId = "", courseId = "", batchId = "";
      let batchDesc = "", batchYear = "";
      const currentYearMatch = app.academicYearId
        ? academicYears.find((y) => y.id === app.academicYearId)
        : undefined;
      batchDesc = currentYearMatch?.description ?? "";
      if (courseDetails.length) {
        // A student can have more than one course-detail row (one per
        // applied preference); acceptedYn marks the one that's actually
        // confirmed. Picking index 0 without checking that can grab an
        // unaccepted preference's degree/course. Fall back to [0] only if
        // none is marked accepted.
        const cd = courseDetails.find((c) => c.acceptedYn) ?? courseDetails[0];
        degreeId = cd.degreeId;
        courseId = cd.courseId;
        batchId = cd.batchId ?? "";
        const batchMatch = batchId ? academicYears.find((y) => y.id === batchId) : undefined;
        batchYear = batchMatch?.batchYear ?? currentYearMatch?.batchYear ?? "";
        try {
          const [deg, crs] = await Promise.all([getDegreeById(degreeId), getCourseById(courseId)]);
          degreeName = deg?.degreeName ?? "—";
          courseName = crs?.name ?? "—";
        } catch { /* optional */ }
      } else {
        batchYear = currentYearMatch?.batchYear ?? "";
      }

      setStudent({
        applicationId: app.id,
        appNo: app.appNo,
        name: app.name ?? "—",
        phone: app.phone ?? "—",
        email: app.email ?? "—",
        category: categoryName,
        degreeName, courseName, degreeId, courseId,
        categoryId: effectiveCategoryId,
        batchDesc, batchYear,
      });

      let loadedDetails: AdmissionFeeStructureDetail[] = [];
      if (degreeId && courseId) {
        try {
          // Prefer the course-detail's batchId (the specific batch/year this
          // student is enrolled under — same resolution order used for
          // batchYear labels here and on the Fee Collection page), and only
          // fall back to the application's academicYearId when batchId is
          // unset. Never fall through to null: passing null silently drops
          // the year filter and lets the backend match ANY year's fee
          // structure for this degree/course/category, which is how a
          // 1st-year student could end up with a 3rd-year fee structure.
          const effectiveYearId = batchId || app.academicYearId || null;
          const fee = await getFeeByFilters(degreeId, courseId, effectiveCategoryId || null, effectiveYearId);
          setFeeStructure(fee);
          loadedDetails = fee?.details ?? [];
        } catch { /* no fee structure */ }
      }
      let prevReceipts: FeeCollectionManualResponseDto[] = [];
      try {
        prevReceipts = (await getFeeCollectionManualByAppNo(app.appNo)) ?? [];
      } catch { /* no prior offline receipts */ }
      setExistingReceipts(prevReceipts);
      setParticularSelections(buildSelections("full", loadedDetails, buildParticularHistory(prevReceipts)));

      // Online (gateway) payments for the same application — shown
      // alongside the offline ones so every admission-fee payment for this
      // student, however it was made, is traceable in one place.
      setOnlinePaymentsLoading(true);
      try {
        const onlineRes = await getPagedFeeCollections({ search: app.appNo, feeType: undefined, page: 1, pageSize: 50 });
        setOnlinePayments(onlineRes.items ?? []);
      } catch {
        setOnlinePayments([]);
      } finally {
        setOnlinePaymentsLoading(false);
      }

      showToast(`Application "${app.appNo}" loaded successfully.`, "success");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      showToast(
        status === 404 ? `Application "${appNo}" not found.` :
          status === 401 ? "Unauthorized. Please log in again." :
            "Failed to load application. Please try again.",
        "error"
      );
    } finally {
      setSearching(false);
    }
  };

  /* ── Generate receipt ────────────────────────────────────── */
  const handleGenerate = async () => {
    if (!student) return;
    setTransactionTouched(true);
    const txErr = validateTransactionId(transactionId);
    if (txErr) { showToast(txErr, "error"); return; }
    if (transactionUsedByOtherStudent) {
      showToast(
        `Blocked: this transaction number is already used on receipt ${transactionDuplicate?.receiptNo ?? "—"} for application ${transactionDuplicate?.appNo ?? "—"}.`,
        "error"
      );
      return;
    }
    if (amountToPay <= 0) { showToast("No amount configured for this payment type.", "error"); return; }
    if (alreadyPaid(paymentType)) {
      showToast(`${PAYMENT_LABEL[paymentType]} has already been fully paid for this application.`, "error");
      return;
    }
    const remaining = remainingFor(paymentType);
    if (remaining > 0 && amountToPay > remaining) {
      showToast(`Only ₹${remaining.toLocaleString("en-IN")} remains for ${PAYMENT_LABEL[paymentType]}.`, "error");
      return;
    }

    const rawDetails = details
      .map((d, i) => {
        const key = detailKey(d, i);
        const sel = particularSelections[key];
        if (!sel) return null;
        if (!sel.checked) return null;
        return { particularName: d.particularName ?? "", particularAmt: parseFloat(sel.amountInput) || (d.amount ?? 0) };
      })
      .filter((x): x is { particularName: string; particularAmt: number } => x !== null);

    // Full Payment's amount is editable, so a student can pay less than the
    // full sticker total (e.g. half now, half later) even without an
    // approved installment split. When that happens, scale each
    // particular's breakdown proportionally so the line items on the
    // receipt sum to what was actually collected (amountToPay) instead of
    // the full sticker total. The rounding remainder is folded into the
    // last line so the numbers always add up exactly.
    const stickerTotal = rawDetails.reduce((s, r) => s + r.particularAmt, 0);
    const selectedDetails =
      paymentType === "full" && stickerTotal > 0 && Math.abs(amountToPay - stickerTotal) > 0.01
        ? (() => {
          const ratio = amountToPay / stickerTotal;
          let running = 0;
          return rawDetails.map((r, i) => {
            const isLast = i === rawDetails.length - 1;
            const amt = isLast
              ? Math.round((amountToPay - running) * 100) / 100
              : Math.round(r.particularAmt * ratio * 100) / 100;
            running += amt;
            return { ...r, particularAmt: amt };
          });
        })()
        : rawDetails;

    setSubmitting(true);
    try {
      const receiptNo = await generateReceiptNumber();
      const result = await createFeeCollectionManual({
        receiptNo,
        feeName: FEE_NAME[paymentType],
        feeAmount: amountToPay,
        transactionId: transactionId.trim(),
        orderId: orderId.trim() || undefined,
        paymentMode,
        paymentDate: new Date().toISOString(),
        appNo: student.appNo,
        appId: student.applicationId,
        details: selectedDetails,
      });
      setGenerated(result);
      setExistingReceipts((prev) => [...prev, result]);
      setAllReceipts((prev) => [result, ...prev]);
      showToast("Receipt generated successfully!", "success");
    } catch {
      showToast("Failed to generate receipt. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Open history receipt ────────────────────────────────── */
  const handleViewHistoryReceipt = async (r: FeeCollectionManualResponseDto) => {
    setGenerated(r);
    setStudent(null);
    setViewStudentInfo(null);
    setAddModalOpen(true);
    if (!r.appNo) return;
    setViewStudentLoading(true);
    try {
      const [fullResult, categories, academicYears] = await Promise.all([
        getFullApplicationByAppNo(r.appNo),
        getLookupsByType("Category", ""),
        getAcademicYears().catch(() => []),
      ]);
      const app = fullResult?.application;
      if (!app) return;
      const categoryName = categories.find((c) => c.id === app.categoryId)?.name ?? "—";
      type CourseDetail = { degreeId: string; courseId: string; batchId?: string; acceptedYn?: boolean };
      const courseDetails = (fullResult.courseDetails ?? []) as CourseDetail[];
      let degreeName = "—", courseName = "—", degreeId = "", courseId = "";
      let batchDesc = "", batchYear = "";
      const currentYearMatch = app.academicYearId ? academicYears.find((y) => y.id === app.academicYearId) : undefined;
      batchDesc = currentYearMatch?.description ?? "";
      if (courseDetails.length) {
        // Same fix as in handleSearch: prefer the accepted preference row.
        const cd = courseDetails.find((c) => c.acceptedYn) ?? courseDetails[0];
        degreeId = cd.degreeId; courseId = cd.courseId;
        const batchMatch = cd.batchId ? academicYears.find((y) => y.id === cd.batchId) : undefined;
        batchYear = batchMatch?.batchYear ?? currentYearMatch?.batchYear ?? "";
        try {
          const [deg, crs] = await Promise.all([getDegreeById(degreeId), getCourseById(courseId)]);
          degreeName = deg?.degreeName ?? "—";
          courseName = crs?.name ?? "—";
        } catch { /* optional */ }
      } else {
        batchYear = currentYearMatch?.batchYear ?? "";
      }
      const si: StudentInfo = {
        applicationId: app.id, appNo: app.appNo,
        name: app.name ?? "—", phone: app.phone ?? "—", email: app.email ?? "—",
        category: categoryName, degreeName, courseName, degreeId, courseId,
        categoryId: app.categoryId ?? "",
        batchDesc, batchYear,
      };
      setViewStudentInfo(si);
      setStudent(si);
      if (r.appNo && batchDesc) {
        setAppNoYearMap((prev) => {
          if (prev.has(r.appNo!)) return prev;
          const next = new Map(prev);
          next.set(r.appNo!, { academicYearDesc: batchDesc, batchYearLabel: batchYear || null });
          return next;
        });
      }
    } catch { showToast("Could not load student details for this receipt.", "info"); }
    finally { setViewStudentLoading(false); }
  };

  /* ── Reset modal state ───────────────────────────────────── */
  const handleResetModal = () => {
    setAddModalOpen(false);
    setAppNoInput("");
    setAppNoError(null);
    setStudent(null);
    setFeeStructure(null);
    setExistingReceipts([]);
    setOnlinePayments([]);
    setInstallmentApproved(false);
    setGenerated(null);
    setPaymentType("full");
    setPaymentMode("DD");
    setTransactionId("");
    setTransactionTouched(false);
    setOrderId("");
    setParticularSelections({});
  };

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  /* ─── Installment particulars table ─────────────────────── */
  const checkedCount = Object.values(particularSelections).filter((s) => s.checked).length;

  const installmentParticularsTable = details.length === 0 ? null : (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
          Fee Particulars
        </label>
        <span className="text-xs font-medium text-gray-400">
          {checkedCount} of {details.length} selected
        </span>
      </div>
      <div className="overflow-hidden border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white bg-primary">
              <th className="w-10 px-3 py-2.5 text-xs font-semibold text-center">Pay</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-left">Particular</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-center">Inst 1</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-center">Inst 2</th>
              <th className="w-36 px-3 py-2.5 text-xs font-semibold text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {details.map((d, i) => {
              const key = detailKey(d, i);
              const sel = particularSelections[key] ?? { checked: false, amountInput: "" };
              const editable = isEditableParticular(d.particularName);
              return (
                <tr key={key} className={`transition-colors ${sel.checked ? "bg-primary/5" : "hover:bg-gray-50"}`}>
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={sel.checked}
                      onChange={(e) => toggleParticular(key, e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-primary"
                    />
                  </td>
                  <td className={`px-3 py-2.5 text-sm ${sel.checked ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                    {d.particularName ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {d.installment1 ? <span className="text-xs font-bold text-emerald-600">✓</span> : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {d.installment2 ? <span className="text-xs font-bold text-emerald-600">✓</span> : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {sel.checked ? (
                      editable ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={sel.amountInput}
                          placeholder="0"
                          onChange={(e) => updateParticularAmount(key, e.target.value.replace(/[^0-9.]/g, ""))}
                          className="w-full px-2 py-1 text-sm text-right bg-white border rounded-lg border-primary/40 focus:outline-none focus:border-primary"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-800">
                          ₹{(parseFloat(sel.amountInput) || d.amount || 0).toLocaleString("en-IN")}
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-gray-300">
                        ₹{(d.amount ?? 0).toLocaleString("en-IN")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-primary bg-primary/5">
              <td colSpan={4} className="px-3 py-2.5 text-sm font-bold text-gray-700">Total</td>
              <td className="px-3 py-2.5 text-base font-bold text-right text-primary">
                ₹{installmentAmountToPay.toLocaleString("en-IN")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  /* ─── Full payment particulars table ─────────────────────── */
  const fullChecked = !installmentApproved
    ? details.filter((d, i) => particularSelections[detailKey(d, i)]?.checked ?? true).length
    : details.length;
  const fullSelectionLocked = installmentApproved || isFullyPaid("full");
  // Particulars that are already fully collected (nothing left owed on
  // them) are excluded from "select all" bookkeeping — they can never be
  // (re)checked, so they shouldn't count toward the selectable total or
  // flip "Select all" to "Unselect all" on their own.
  const fullSelectableCount = !installmentApproved
    ? details.filter((d) => roundMoney(Math.max((d.amount ?? 0) - collectedForParticular(d.particularName), 0)) > 0.01).length
    : details.length;

  const fullParticularsTable = details.length === 0 ? null : (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
          Fee Particulars
        </label>
        {!installmentApproved ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400">
              {fullChecked} of {fullSelectableCount} selected
            </span>
            <button
              type="button"
              onClick={() => setAllParticularsChecked(fullChecked < fullSelectableCount)}
              disabled={fullSelectionLocked || fullSelectableCount === 0}
              className="text-xs font-semibold text-primary hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
            >
              {fullChecked < fullSelectableCount ? "Select all" : "Unselect all"}
            </button>
          </div>
        ) : null}
      </div>
      <div className="overflow-hidden border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white bg-primary">
              {!installmentApproved && (
                <th className="w-10 px-3 py-2.5 text-xs font-semibold text-center">Pay</th>
              )}
              <th className="px-3 py-2.5 text-xs font-semibold text-left">Particular</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-center">Inst 1</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-center">Inst 2</th>
              <th className="w-36 px-3 py-2.5 text-xs font-semibold text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {details.map((d, i) => {
              const key = detailKey(d, i);
              const sel = particularSelections[key] ?? { checked: true, amountInput: "" };
              const editableParticular = isEditableParticular(d.particularName);
              const editable = !installmentApproved && !fullSelectionLocked && editableParticular;
              const due = d.amount ?? 0;
              const collected = !installmentApproved ? collectedForParticular(d.particularName) : 0;
              const remaining = roundMoney(Math.max(due - collected, 0));
              // Locked once nothing's left to collect on this particular —
              // applies whether it's editable or fixed. A fixed particular
              // can still have a partial balance left (a previous partial
              // Full Payment scales every selected particular's amount
              // proportionally, not just the editable ones), so "collected
              // > 0" alone isn't enough to call it done.
              const lockedCollected = !installmentApproved && collected > 0 && remaining <= 0.01;
              const partiallyCollected = !installmentApproved && collected > 0 && !lockedCollected;
              // Once installments are approved, Full Payment must cover
              // everything — there's nothing to select, so the checkbox
              // column (and the ability to uncheck/edit a particular) is
              // dropped entirely rather than just disabled, so it can't be
              // mistaken for a second way to bypass the installment split.
              // Once Full Payment is itself fully collected, the checkboxes
              // lock too — nothing left to configure for this payment type.
              return (
                <tr key={key} className={`transition-colors ${lockedCollected ? "opacity-60" : sel.checked ? "bg-primary/5" : "hover:bg-gray-50"}`}>
                  {!installmentApproved && (
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={lockedCollected ? false : sel.checked}
                        disabled={fullSelectionLocked || lockedCollected}
                        onChange={(e) => toggleParticular(key, e.target.checked)}
                        className="w-4 h-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </td>
                  )}
                  <td className={`px-3 py-2.5 text-sm ${sel.checked && !lockedCollected ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                    {d.particularName ?? "—"}
                    {partiallyCollected && (
                      <span className="block text-[10px] font-normal text-gray-400">
                        ₹{collected.toLocaleString("en-IN")} collected · ₹{remaining.toLocaleString("en-IN")} remaining
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {d.installment1 ? <span className="text-xs font-bold text-emerald-600">✓</span> : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {d.installment2 ? <span className="text-xs font-bold text-emerald-600">✓</span> : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {lockedCollected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle size={12} /> ₹{collected.toLocaleString("en-IN")} already collected
                      </span>
                    ) : sel.checked ? (
                      editable ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={sel.amountInput}
                          placeholder="0"
                          onChange={(e) => updateParticularAmount(key, e.target.value.replace(/[^0-9.]/g, ""))}
                          className="w-full px-2 py-1 text-sm text-right bg-white border rounded-lg border-primary/40 focus:outline-none focus:border-primary"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-800">
                          ₹{(parseFloat(sel.amountInput) || due || 0).toLocaleString("en-IN")}
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-gray-300">
                        ₹{due.toLocaleString("en-IN")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {(feeDeduction > 0 || feeFine > 0) && (
              <tr className="border-t-2 border-primary bg-gray-50/60">
                <td colSpan={installmentApproved ? 3 : 4} className="px-3 py-2 text-sm font-semibold text-gray-600">Subtotal</td>
                <td className="px-3 py-2 text-sm font-semibold text-right text-gray-700">
                  ₹{feeSubtotal.toLocaleString("en-IN")}
                </td>
              </tr>
            )}
            {feeDeduction > 0 && (
              <tr className="bg-gray-50/60">
                <td colSpan={installmentApproved ? 3 : 4} className="px-3 py-2 text-sm font-medium text-gray-600">Deduction</td>
                <td className="px-3 py-2 text-sm font-semibold text-right text-red-500">
                  -₹{feeDeduction.toLocaleString("en-IN")}
                </td>
              </tr>
            )}
            {feeFine > 0 && (
              <tr className="bg-gray-50/60">
                <td colSpan={installmentApproved ? 3 : 4} className="px-3 py-2 text-sm font-medium text-gray-600">
                  Late Fine <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 align-middle">active</span>
                </td>
                <td className="px-3 py-2 text-sm font-semibold text-right text-amber-600">
                  +₹{feeFine.toLocaleString("en-IN")}
                </td>
              </tr>
            )}
            <tr className="border-t-2 border-primary">
              <td colSpan={installmentApproved ? 3 : 4} className="px-3 py-2.5 text-sm font-bold text-gray-700">
                {feeDeduction > 0 || feeFine > 0 ? "Payable Amount" : "Total"}
              </td>
              <td className="px-3 py-2.5 text-base font-bold text-right text-primary">
                ₹{fullAmt.toLocaleString("en-IN")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════ */

  return (
    <AppLayout pageTitle="Receipt Entry">
      <div className="flex flex-col h-full pb-4"
        style={{ zoom: 0.95 }}>
        {toast && (
          <div className="fixed z-[60] top-5 right-5">
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          </div>
        )}

        <div data-testid="receipt-entry-page" className="pb-8 space-y-4">

          {/* ── Page Header ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text">Receipt Entry</h1>
              <p className="text-sm text-gray-500">Record manual payments and generate admission fee receipts.</p>
            </div>
            <Button variant="primary" onClick={() => setAddModalOpen(true)}>
              <Receipt size={15} /> Add New Receipt
            </Button>
          </div>

          {/* ── History Table ── */}
          <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
            {/* Table header */}
            <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b bg-gray-50/80">
              <p className="text-sm font-semibold text-gray-700">Receipt History</p>
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute text-gray-400 -translate-y-1/2 pointer-events-none left-3 top-1/2" />
                <input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search receipt, app no., fee type…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-primary"
                />
              </div>
              <span className="text-xs font-medium text-gray-400 shrink-0 bg-gray-100 px-2.5 py-1 rounded-full">
                {groupedAllHistory.length} application{groupedAllHistory.length === 1 ? "" : "s"} · {filteredHistory.length} receipt{filteredHistory.length === 1 ? "" : "s"}
              </span>
            </div>

            {historyLoading ? (
              <div className="py-16"><Loader /></div>
            ) : groupedAllHistory.length === 0 ? (
              <div className="p-16 text-center">
                <div className="flex items-center justify-center mx-auto mb-4 bg-gray-100 rounded-full w-14 h-14">
                  <Search size={24} className="text-gray-300" />
                </div>
                <p className="text-base font-semibold text-gray-600">No receipts found</p>
                <p className="mt-1 text-sm text-gray-400">
                  {historySearch ? "Try a different search term." : "No receipts have been generated yet."}
                </p>
              </div>
            ) : (
              <>
                {yearColorMap.size > 0 && (
                  <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b bg-gray-50">
                    <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Academic Year</span>
                    {[...yearColorMap.entries()].map(([label, colorClass]) => (
                      <span key={label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
                        {label}
                      </span>
                    ))}
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse table-fixed">
                    <colgroup>
                      <col className="w-[4%]" />
                      <col className="w-[12%]" />
                      <col className="w-[10%]" />
                      <col className="w-[17%]" />
                      <col className="w-[12%]" />
                      <col className="w-[10%]" />
                      <col className="w-[9%]" />
                      <col className="w-[12%]" />
                      <col className="w-[14%]" />
                    </colgroup>
                    <thead>
                      <tr className="text-xs font-semibold text-white bg-primary">
                        <th className="px-3 py-2"></th>
                        <th className="px-3 py-2 text-center">App No.</th>
                        <th className="px-3 py-2 text-center">Source</th>
                        <th className="px-3 py-2 text-left">Student Name</th>
                        <th className="px-3 py-2 text-center">Academic Year</th>
                        <th className="px-3 py-2 text-center">Batch Year</th>
                        <th className="px-3 py-2 text-center">Receipts</th>
                        <th className="px-3 py-2 text-center">Total Paid</th>
                        <th className="px-3 py-2 text-center">Last Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedGroups.map((group) => {
                        const yearInfo = group.appNo !== "—" ? appNoYearMap.get(group.appNo) : undefined;
                        const yearColorClass = yearInfo?.academicYearDesc
                          ? (yearColorMap.get(yearInfo.academicYearDesc) ?? "bg-gray-100 text-gray-600 border-gray-200")
                          : null;
                        // Enrichment (name / academic year / batch year) is fetched
                        // async, scoped to just this page — appNoYearMap won't have
                        // this appNo yet on first paint. Only rows that WILL get
                        // enriched (have both an appNo and applicationId) should
                        // show a skeleton; rows without an applicationId will never
                        // get an entry and should just show "—".
                        const isPending =
                          group.appNo !== "—" && !!group.applicationId && !appNoYearMap.has(group.appNo);
                        return (
                          <ManualReceiptGroupRow
                            key={group.key}
                            group={group}
                            isOpen={expandedHistoryKeys.has(group.key)}
                            onToggle={() => toggleHistoryGroup(group.key)}
                            onView={handleViewHistoryReceipt}
                            yearInfo={yearInfo}
                            yearColorClass={yearColorClass}
                            isPending={isPending}
                            fmtDate={fmtDate}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {groupedAllHistory.length > HISTORY_PAGE_SIZE && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <Pagination page={safeHistoryPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
          ── Add Receipt Modal ──
      ══════════════════════════════════════════════════════ */}
        <Modal
          open={addModalOpen}
          onClose={handleResetModal}
          title="Add New Receipt"
          size="xl"
          testId="add-receipt-modal"
        >
          {generated ? (
            /* ─── Generated Receipt View (inside modal) ─── */
            <div className="space-y-4">
              <style>{`
              /* ── Screen: hide the portal root ── */
              #receipt-printroot { 
                display: none !important;
                visibility: hidden !important;
              }

              @media print {
                @page {
                  size: A4 portrait;
                  margin: 10mm;
                }

                html, body {
                  background: white !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                  height: 100% !important;
                }

                /* Hide everything on the page first */
                body > * {
                  display: none !important;
                }

                /* Show only the print root */
                #receipt-printroot {
                  display: block !important;
                  visibility: visible !important;
                  position: static !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  z-index: 99999 !important;
                }

                #receipt-printroot * {
                  visibility: visible !important;
                }

                /* Receipt card - match on-screen preview style */
                #rp-card {
                  width: 100% !important;
                  max-width: 600px !important;
                  border: 1px solid #e5e7eb !important;
                  border-radius: 8px !important;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
                  overflow: visible !important;
                  page-break-inside: avoid !important;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
                  margin: auto !important;
                  padding: 0 !important;
                  background: white !important;
                }

                /* Uniform text across the whole receipt */
                #rp-card * {
                  box-sizing: border-box !important;
                }

                #rp-header {
                  background-color: #820000 !important;
                  color: white !important;
                  padding: 16px 20px !important;
                  display: flex !important;
                  align-items: center !important;
                  gap: 12px !important;
                  border-radius: 8px 8px 0 0 !important;
                }
                #rp-header img   { width: 36px !important; height: 36px !important; object-fit: contain !important; }
                #rp-header div:nth-of-type(2) { flex: 1 !important; }
                #rp-header h2    { font-size: 14px !important; font-weight: 700 !important; margin: 0 !important; line-height: 1.3 !important; }
                #rp-header p     { font-size: 10px !important; opacity: 0.85 !important; margin: 2px 0 0 0 !important; }
                #rp-header .rp-badge {
                  margin-left: auto !important;
                  background: rgba(255,255,255,0.15) !important; !important;
                  border-radius: 4px !important;
                  padding: 4px 8px !important;
                  font-size: 8px !important;
                  letter-spacing: 0.08em !important;
                  font-weight: 600 !important;
                  color: white !important;
                  white-space: nowrap !important;
                }

                /* Receipt-no strip */
                #rp-strip {
                  display: flex !important;
                  align-items: flex-start !important;
                  justify-content: space-between !important;
                  padding: 8px 20px !important;
                  border-bottom: 1px solid #e5e7eb !important;
                  background: #f9fafb !important;
                }
                #rp-strip > div:first-child {
                  flex: 1 !important;
                }
                #rp-strip .rp-label  { font-size: 9px !important; color: #9ca3af !important; text-transform: uppercase !important; letter-spacing: 0.06em !important; font-weight: 600 !important; }
                #rp-strip .rp-value  { font-size: 13px !important; font-weight: 700 !important; font-family: monospace !important; color: #1e3a5f !important; margin-top: 4px !important; }

                #rp-barcode {
                  display: flex !important;
                  justify-content: center !important;
                  padding: 8px 20px !important;
                  border-bottom: 1px solid #e5e7eb !important;
                }
                #rp-barcode svg { height: 36px !important; width: auto !important; }

                /* Body padding */
                #rp-body { padding: 16px 20px !important; }

                /* Section labels */
                .rp-section-label {
                  font-size: 9px !important;
                  font-weight: 700 !important;
                  text-transform: uppercase !important;
                  letter-spacing: 0.08em !important;
                  color: #9ca3af !important;
                  margin-bottom: 8px !important;
                }

                /* 2-col info grid */
                .rp-info-grid {
                  display: grid !important;
                  grid-template-columns: 1fr 1fr !important;
                  gap: 8px 24px !important;
                  margin-bottom: 12px !important;
                }
                .rp-info-grid > div {
                  display: block !important;
                }
                .rp-info-grid .rp-cell-label {
                  font-size: 8px !important;
                  color: #9ca3af !important;
                  text-transform: uppercase !important;
                  letter-spacing: 0.06em !important;
                  margin-bottom: 2px !important;
                }
                .rp-info-grid .rp-cell-value {
                  font-size: 11px !important;
                  font-weight: 600 !important;
                  color: #111827 !important;
                }

                /* Divider */
                .rp-divider {
                  border: none !important;
                  border-top: 1px solid #e5e7eb !important;
                  margin: 12px 0 !important;
                }

                /* Particulars table */
                #rp-particulars { width: 100% !important; border-collapse: collapse !important; margin-bottom: 12px !important; }
                #rp-particulars thead { display: table-header-group !important; }
                #rp-particulars thead tr { background: #f9fafb !important; }
                #rp-particulars th {
                  padding: 8px 0 !important;
                  font-size: 9px !important;
                  font-weight: 700 !important;
                  text-transform: uppercase !important;
                  letter-spacing: 0.06em !important;
                  color: #6b7280 !important;
                  border-bottom: 1px solid #e5e7eb !important;
                  text-align: left !important;
                }
                #rp-particulars th:last-child { text-align: right !important; }
                #rp-particulars td { padding: 6px 0 !important; border-bottom: 1px solid #f3f4f6 !important; font-size: 11px !important; }
                #rp-particulars td:last-child { text-align: right !important; font-weight: 600 !important; }
                #rp-particulars tfoot { display: table-footer-group !important; }
                #rp-particulars tfoot td {
                  padding: 8px 0 !important;
                  font-weight: 700 !important;
                  border-top: 2px solid #1e3a5f !important;
                  color: #1e3a5f !important;
                  font-size: 12px !important;
                }
                #rp-particulars tfoot td:last-child { text-align: right !important; }

                /* Total bar */
                #rp-total {
                  display: flex !important;
                  justify-content: space-between !important;
                  align-items: center !important;
                  padding: 12px 0 !important;
                  border-top: 2px solid #1e3a5f !important;
                }
                #rp-total .rp-total-label { font-size: 12px !important; font-weight: 600 !important; color: #374151 !important; }
                #rp-total .rp-total-value { font-size: 16px !important; font-weight: 800 !important; color: #1e3a5f !important; }

                /* Footer */
                #rp-footer {
                  padding: 12px 20px !important;
                  text-align: center !important;
                  font-size: 9px !important;
                  color: #9ca3af !important;
                  border-top: 1px solid #e5e7eb !important;
                  background: #f9fafb !important;
                  line-height: 1.5 !important;
                  border-radius: 0 0 8px 8px !important;
                }
              }
            `}</style>

              {/* ── On-screen success banner + action buttons ── */}
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100">
                    <CheckCircle size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Receipt Generated!</p>
                    <p className="text-xs text-gray-400">{generated.receiptNo}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer size={14} /> Print
                  </Button>
                  <Button variant="primary" onClick={handleResetModal}>
                    <RefreshCw size={14} /> Done
                  </Button>
                </div>
              </div>

              {/* ── On-screen receipt preview ── */}
              <div className="max-w-lg mx-auto overflow-hidden bg-white border shadow-sm rounded-xl">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 text-white bg-primary">
                  <img src="/logo2.png" alt="logo" className="object-contain w-9 h-9 shrink-0" />
                  <div className="flex-1">
                    <h2 className="text-sm font-bold leading-tight">MGRDPR University</h2>
                    <p className="text-[10px] opacity-80">Kaushalya Vikas Bhavan, Nagavi, Gadag</p>
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-widest opacity-90 bg-white/15 rounded px-2 py-1">
                    Fee Receipt
                  </span>
                </div>
                {/* Receipt no. strip */}
                <div className="flex items-center justify-between px-5 py-2 border-b bg-gray-50">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">Receipt No.</span>
                  <span className="font-mono text-sm font-bold tracking-widest text-primary">{generated.receiptNo}</span>
                </div>
                {/* Barcode */}
                <div className="flex justify-center px-5 py-2.5 border-b">
                  <Barcode value={generated.receiptNo || "NA"} format="CODE128" width={1.4} height={36} displayValue={false} />
                </div>
                {/* Body */}
                <div className="p-5 space-y-4">
                  {/* Student + Payment info in 2-col grid */}
                  <div className="grid grid-cols-2 text-sm gap-x-5 gap-y-3">
                    <PRow label="Application No." value={generated.appNo ?? "—"} />
                    <PRow label="Student Name" value={student?.name ?? "—"} />
                    <PRow label="Category" value={student?.category ?? "—"} />
                    <PRow label="Degree" value={student?.degreeName ?? "—"} />
                    <PRow label="Course" value={student?.courseName ?? "—"} />
                    {student?.batchDesc && (
                      <PRow label="Academic Year" value={student.batchDesc} />
                    )}
                    {student?.batchYear && (
                      <PRow label="Batch Year" value={student.batchYear} />
                    )}
                    <PRow label="Fee Type" value={generated.feeName} />
                    <PRow label="Mode" value={generated.paymentMode ?? paymentMode} />
                    <PRow label="Transaction ID" value={generated.transactionId ?? "—"} />
                    <PRow label="Date" value={fmtDate(generated.paymentDate)} />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                        <CheckCircle size={10} /> SUCCESS
                      </span>
                    </div>
                  </div>

                  {/* Particulars */}
                  {generated.details?.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Fee Particulars</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Particular</th>
                            <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {generated.details.map((d, i) => (
                            <tr key={i}>
                              <td className="px-2 py-1.5 text-gray-700">{d.particularName}</td>
                              <td className="px-2 py-1.5 text-right font-medium text-gray-800">₹{(d.particularAmt ?? 0).toLocaleString("en-IN")}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-primary">
                            <td className="px-2 py-2 font-bold text-gray-700">Total</td>
                            <td className="px-2 py-2 text-base font-bold text-right text-primary">₹{generated.feeAmount.toLocaleString("en-IN")}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Total — shown only when no particulars table (to avoid duplication) */}
                  {(!generated.details || generated.details.length === 0) && (
                    <div className="flex items-center justify-between pt-3 border-t-2 border-primary">
                      <span className="text-sm font-semibold text-gray-700">Total Amount Collected</span>
                      <span className="text-xl font-bold text-primary">₹{generated.feeAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </div>
                {/* Footer */}
                <div className="bg-gray-50 border-t px-5 py-2 text-center text-[9px] text-gray-400 leading-relaxed">
                  This is a computer-generated receipt and does not require a signature.
                  Admission shall be confirmed only upon physical verification of the duly submitted online admission application.
                </div>
              </div>

              {/* ── Print portal: rendered outside modal using React portal ── */}
              {typeof window !== "undefined" && createPortal(
                <div id="receipt-printroot" aria-hidden="true">
                  <div id="rp-card">
                    {/* Header - matches on-screen preview */}
                    <div id="rp-header">
                      <img src="/logo2.png" alt="" />
                      <div>
                        <h2>MGRDPR University</h2>
                        <p>Kaushalya Vikas Bhavan, Nagavi, Gadag</p>
                      </div>
                      <span className="rp-badge">Fee Receipt</span>
                    </div>

                    {/* Receipt No. + barcode strip */}
                    <div id="rp-strip">
                      <div>
                        <div className="rp-label">Receipt No.</div>
                        <div className="rp-value">{generated.receiptNo}</div>
                      </div>
                      <div id="rp-barcode">
                        <Barcode value={generated.receiptNo || "NA"} format="CODE128" width={1.4} height={36} displayValue={false} />
                      </div>
                    </div>

                    {/* Body - matches on-screen preview layout */}
                    <div id="rp-body">
                      {/* 2-column info grid - matches on-screen */}
                      <div className="rp-info-grid">
                        <div>
                          <div className="rp-cell-label">Application No.</div>
                          <div className="rp-cell-value">{generated.appNo ?? "—"}</div>
                        </div>
                        <div>
                          <div className="rp-cell-label">Student Name</div>
                          <div className="rp-cell-value">{student?.name ?? "—"}</div>
                        </div>
                        <div>
                          <div className="rp-cell-label">Category</div>
                          <div className="rp-cell-value">{student?.category ?? "—"}</div>
                        </div>
                        <div>
                          <div className="rp-cell-label">Degree</div>
                          <div className="rp-cell-value">{student?.degreeName ?? "—"}</div>
                        </div>
                        <div>
                          <div className="rp-cell-label">Course</div>
                          <div className="rp-cell-value">{student?.courseName ?? "—"}</div>
                        </div>
                        {student?.batchDesc && (
                          <div>
                            <div className="rp-cell-label">Academic Year</div>
                            <div className="rp-cell-value">{student.batchDesc}</div>
                          </div>
                        )}
                        {student?.batchYear && (
                          <div>
                            <div className="rp-cell-label">Batch Year</div>
                            <div className="rp-cell-value">{student.batchYear}</div>
                          </div>
                        )}
                        <div>
                          <div className="rp-cell-label">Fee Type</div>
                          <div className="rp-cell-value">{generated.feeName}</div>
                        </div>
                        <div>
                          <div className="rp-cell-label">Mode</div>
                          <div className="rp-cell-value">{generated.paymentMode ?? paymentMode}</div>
                        </div>
                        <div>
                          <div className="rp-cell-label">Transaction ID</div>
                          <div className="rp-cell-value">{generated.transactionId ?? "—"}</div>
                        </div>
                        <div>
                          <div className="rp-cell-label">Date</div>
                          <div className="rp-cell-value">{fmtDate(generated.paymentDate)}</div>
                        </div>
                        <div>
                          <div className="rp-cell-label">Status</div>
                          <div className="rp-cell-value">SUCCESS ✓</div>
                        </div>
                      </div>

                      <hr className="rp-divider" />

                      {/* Particulars table */}
                      {generated.details?.length > 0 && (
                        <>
                          <div className="rp-section-label">Fee Particulars</div>
                          <table id="rp-particulars">
                            <thead>
                              <tr>
                                <th>Particular</th>
                                <th>Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {generated.details.map((d, i) => (
                                <tr key={i}>
                                  <td>{d.particularName}</td>
                                  <td>₹{(d.particularAmt ?? 0).toLocaleString("en-IN")}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td>Total</td>
                                <td>₹{generated.feeAmount.toLocaleString("en-IN")}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </>
                      )}

                      {/* Total (no particulars) */}
                      {(!generated.details || generated.details.length === 0) && (
                        <div id="rp-total">
                          <span className="rp-total-label">Total Amount Collected</span>
                          <span className="rp-total-value">₹{generated.feeAmount.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer - matches on-screen preview */}
                    <div id="rp-footer">
                      This is a computer-generated receipt and does not require a signature.<br />
                      Admission shall be confirmed only upon physical verification of the duly submitted online admission application.
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>
          ) : (
            /* ─── Add Receipt Form ─── */
            <div className="space-y-5">

              {/* Section 1: Search */}
              <div>
                <p className="mb-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Search Application</p>
                <div className="flex items-start gap-3">
                  <div className="flex-1 max-w-sm">
                    <Input
                      label="Application Number"
                      placeholder="e.g. 2627MGRDPR00001"
                      value={appNoInput}
                      onChange={(e) => { setAppNoInput(e.target.value); setAppNoError(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                    />
                    {appNoError && (
                      <p className="flex items-center gap-1 mt-1.5 text-xs font-medium text-red-500">
                        <AlertCircle size={12} /> {appNoError}
                      </p>
                    )}
                  </div>
                  <Button variant="primary" onClick={handleSearch} disabled={searching} className="mt-6">
                    <Search size={15} />
                    {searching ? "Searching…" : "Search"}
                  </Button>
                </div>
              </div>

              {/* Section 2: Student Card */}
              {student && (
                <>
                  <div className="overflow-hidden border border-gray-200 rounded-xl bg-gray-50/50">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50">
                      <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">Student Information</p>
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{student.appNo}</span>
                    </div>
                    <div className="grid grid-cols-3 p-4 gap-x-6 gap-y-3">
                      <InfoCell label="Full Name" value={student.name} />
                      <InfoCell label="Phone" value={student.phone} />
                      <InfoCell label="Email" value={student.email} />
                      <InfoCell label="Category" value={student.category} />
                      <InfoCell label="Degree" value={student.degreeName} />
                      <InfoCell label="Course" value={student.courseName} />
                      {student.batchDesc && (
                        <InfoCell label="Academic Year" value={student.batchDesc} />
                      )}
                      {student.batchYear && (
                        <InfoCell label="Batch Year" value={student.batchYear} />
                      )}
                    </div>
                  </div>

                  {/* Previous Payments — offline (manual) + online (gateway),
                      so every admission-fee payment for this application is
                      traceable in one place before a new receipt is added. */}
                  <div className="overflow-hidden border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50">
                      <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">Previous Payments</p>
                      <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {previousPayments.length} record{previousPayments.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {onlinePaymentsLoading ? (
                      <div className="py-6"><Loader /></div>
                    ) : previousPayments.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-gray-400">No previous payments found for this application.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-gray-500 bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 font-medium text-left">Source</th>
                              <th className="px-3 py-2 font-medium text-left">Fee Type</th>
                              <th className="px-3 py-2 font-medium text-left">Reference</th>
                              <th className="px-3 py-2 font-medium text-right">Amount</th>
                              <th className="px-3 py-2 font-medium text-center">Date</th>
                              <th className="px-3 py-2 font-medium text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {previousPayments.map((p) => (
                              <tr key={p.key} className="hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${p.source === "online" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                                    }`}>
                                    {p.source === "online" ? <Globe size={10} /> : <Receipt size={10} />}
                                    {p.source === "online" ? "Online" : "Offline"}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-700">{p.feeType}</td>
                                <td className="px-3 py-2 font-mono text-gray-500">{p.reference}</td>
                                <td className="px-3 py-2 font-semibold text-right text-gray-800">
                                  ₹{p.amount.toLocaleString("en-IN")}
                                </td>
                                <td className="px-3 py-2 text-center text-gray-500">{fmtDate(p.date)}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass(p.status)}`}>
                                    {p.status ?? "—"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Section 3: Payment Form */}
              {student && (
                <>
                  <div className="h-px bg-gray-100" />

                  {/* Payment mode + transaction */}
                  <div>
                    <p className="mb-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Payment Details</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="block text-sm font-medium text-text mb-1.5">Mode of Payment</label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-text focus:outline-none focus:border-primary"
                        >
                          {["DD", "Cash", "Cheque", "NEFT", "RTGS", "UPI"].map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Input
                          label="Transaction / Reference Number"
                          placeholder="DD no., cheque no., UTR, etc."
                          value={transactionId}
                          onChange={(e) => {
                            setTransactionId(e.target.value);
                            if (!transactionTouched) setTransactionTouched(true);
                          }}
                        />
                        {transactionError && (
                          <p className="flex items-center gap-1 mt-1.5 text-xs font-medium text-red-500">
                            <AlertCircle size={12} /> {transactionError}
                          </p>
                        )}
                        {!transactionError && transactionReusedBySameStudent && (
                          <p className="flex items-center gap-1 mt-1.5 text-xs font-medium text-amber-600">
                            <AlertCircle size={12} />
                            Already used on receipt {transactionDuplicate?.receiptNo ?? "—"} for this
                            student ({transactionDuplicate?.feeName ?? "—"}). Only continue if this is
                            the same payment split across receipts.
                          </p>
                        )}
                      </div>
                      <Input
                        label="Order ID (optional)"
                        placeholder="Optional reference"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Payment type selector */}
                  <div>
                    <p className="mb-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Payment Type</p>
                    {!installmentApproved && (
                      <p className="flex items-center gap-1.5 mb-3 text-xs font-medium text-amber-600">
                        <AlertCircle size={12} />
                        Installment payment isn't approved for this student. Approve it from Document
                        Verification to unlock Installment 1 / 2 — until then, only Full Payment is
                        available (partial amounts are allowed below).
                      </p>
                    )}
                    <div className={`grid gap-3 ${visiblePaymentTypes.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}>
                      {visiblePaymentTypes.map((type) => {
                        const paid = alreadyPaid(type);
                        const partial = isPartiallyPaid(type);
                        const active = paymentType === type;
                        return (
                          <button
                            key={type}
                            onClick={() => handlePaymentTypeChange(type)}
                            disabled={paid}
                            className={`relative rounded-xl border-2 p-3 text-left transition-all
                            ${paid ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                                : active ? "border-primary bg-primary/5 shadow-sm"
                                  : partial ? "border-amber-200 bg-amber-50/40"
                                    : "border-gray-200 bg-white hover:border-primary/40 hover:shadow-sm"}`}
                          >
                            {paid && (
                              <span className="absolute top-1.5 right-1.5 text-[9px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-semibold">Done</span>
                            )}
                            {!paid && partial && (
                              <span className="absolute top-1.5 right-1.5 text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold">Partial</span>
                            )}
                            <div className={`w-3.5 h-3.5 rounded-full border-2 mb-2 flex items-center justify-center ${active ? "border-primary" : "border-gray-300"}`}>
                              {active && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <p className={`text-sm font-semibold ${active ? "text-primary" : paid ? "text-gray-400" : "text-gray-700"}`}>
                              {PAYMENT_LABEL[type]}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {type === "full" ? `₹${fullAmt.toLocaleString("en-IN")}` : active ? `₹${installmentAmountToPay.toLocaleString("en-IN")}` : "select to configure"}
                            </p>
                            {!paid && partial && (
                              <p className="mt-0.5 text-[10px] font-medium text-amber-600">
                                ₹{remainingFor(type).toLocaleString("en-IN")} remaining
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {isPartiallyPaid(paymentType) && (
                    <div className="flex items-center justify-between px-4 py-2.5 text-sm border rounded-xl border-amber-200 bg-amber-50/60">
                      <span className="font-medium text-amber-700">
                        ₹{paidFor(paymentType).toLocaleString("en-IN")} already collected for {PAYMENT_LABEL[paymentType]}
                        {paymentType === "full" && " (offline + online)"}
                      </span>
                      <span className="font-semibold text-amber-700">
                        ₹{remainingFor(paymentType).toLocaleString("en-IN")} remaining
                      </span>
                    </div>
                  )}

                  {/* Particulars table */}
                  {paymentType === "full" ? fullParticularsTable : installmentParticularsTable}

                  {/* Amount summary */}
                  <div className="flex items-center justify-between px-4 py-3 border-2 rounded-xl bg-primary/5 border-primary/20">
                    <div>
                      <p className="text-xs tracking-wide text-gray-500 uppercase">Amount to Collect</p>
                      {paymentType === "full" && !installmentApproved && isFullyPaid("full") ? (
                        <>
                          <p className="flex items-center gap-1 mt-1 text-2xl font-bold text-emerald-600">
                            <IndianRupee size={18} className="opacity-70" />{fullAmt.toLocaleString("en-IN")}
                          </p>
                          <p className="mt-1 text-[11px] font-medium text-emerald-600">
                            Full amount collected.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-primary mt-0.5 flex items-center gap-1">
                            <IndianRupee size={18} className="opacity-70" />{amountToPay.toLocaleString("en-IN")}
                          </p>
                          {paymentType === "full" && !installmentApproved && (
                            <p className="mt-1 text-[11px] text-gray-400">
                              Full amount is ₹{fullAmt.toLocaleString("en-IN")}
                              {remainingFor("full") > 0 && remainingFor("full") < fullAmt ? ` · ₹${remainingFor("full").toLocaleString("en-IN")} still due` : ""}
                              . Adjust the editable fee particulars above (tuition, library, lab) to record a partial payment.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs tracking-wide text-gray-400 uppercase">Mode</span>
                      <p className="text-sm font-bold text-gray-700">{paymentMode}</p>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="flex flex-col items-end gap-2 pt-3 border-t border-gray-100">
                    {generateDisabledReason() && !submitting && (
                      <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                        <AlertCircle size={13} /> {generateDisabledReason()}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleResetModal} disabled={submitting}>
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleGenerate}
                        disabled={submitting || !!generateDisabledReason()}
                      >
                        <Receipt size={15} />
                        {submitting ? "Generating…" : "Generate Receipt"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}

/* ─── Helper components ──────────────────────────────────── */

/** One expandable application row in the grouped Receipt History table,
 * plus its nested per-receipt table when opened. Mirrors FeeGroupRows on
 * the Fee Collection page. */
function ManualReceiptGroupRow({
  group, isOpen, onToggle, onView, yearInfo, yearColorClass, isPending, fmtDate,
}: {
  group: ManualReceiptGroup;
  isOpen: boolean;
  onToggle: () => void;
  onView: (r: FeeCollectionManualResponseDto) => void;
  yearInfo?: { academicYearDesc: string; batchYearLabel: string | null; studentName?: string };
  yearColorClass: string | null;
  isPending: boolean;
  fmtDate: (iso?: string | null) => string;
}) {
  return (
    <>
      <tr
        className="transition-colors border-t cursor-pointer hover:bg-primary/5 border-slate-100"
        onClick={onToggle}
      >
        <td className="px-3 py-2.5 text-center text-gray-400">
          {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </td>
        <td className="px-3 py-2.5 text-center">
          <span className="font-mono text-sm font-bold text-primary">{group.appNo}</span>
        </td>
        <td className="px-3 py-2.5 text-center">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            <Receipt size={10} /> Manual
          </span>
        </td>
        <td className="px-3 py-2.5 text-left">
          {isPending ? (
            <span className="inline-block h-3.5 w-28 rounded bg-gray-200 animate-pulse" />
          ) : (
            <p className="text-[13px] font-semibold text-slate-700 truncate">
              {yearInfo?.studentName ?? group.studentName}
            </p>
          )}
        </td>
        <td className="px-3 py-2.5 text-center">
          {isPending ? (
            <span className="inline-block w-16 h-4 bg-gray-200 rounded-full animate-pulse" />
          ) : yearInfo?.academicYearDesc ? (
            <span className={`inline-flex items-center max-w-full px-2 py-0.5 rounded-full text-xs font-semibold border align-middle truncate ${yearColorClass}`}>
              {yearInfo.academicYearDesc}
            </span>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </td>
        <td className="px-3 py-2.5 text-center">
          {isPending ? (
            <span className="inline-block w-12 h-4 bg-gray-200 rounded-full animate-pulse" />
          ) : yearInfo?.batchYearLabel ? (
            <span className="inline-flex items-center max-w-full px-2 py-0.5 rounded-full text-xs font-bold border align-middle truncate text-teal-700 bg-teal-50 border-teal-200">
              {yearInfo.batchYearLabel}
            </span>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </td>
        <td className="px-3 py-2.5 text-center text-[13px] font-semibold text-slate-600">
          {group.records.length}
        </td>
        <td className="px-3 py-2.5 text-center text-[13px] font-bold text-slate-800">
          ₹{group.totalPaid.toLocaleString("en-IN")}
        </td>
        <td className="px-3 py-2.5 text-center text-[13px] font-semibold text-slate-500">
          {fmtDate(group.latestPaymentDate)}
        </td>
      </tr>

      {isOpen && (
        <tr className="border-t bg-gray-50/60">
          <td colSpan={9} className="px-4 py-3">
            <div className="overflow-hidden bg-white border rounded-lg">
              <table className="w-full text-sm">
                <thead className="text-gray-500 bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 font-medium text-left">Receipt No.</th>
                    <th className="px-3 py-2 font-medium text-left">Fee Type</th>
                    <th className="px-3 py-2 font-medium text-center">Mode</th>
                    <th className="px-3 py-2 font-medium text-center">Date</th>
                    <th className="px-3 py-2 font-medium text-right">Amount</th>
                    <th className="px-3 py-2 font-medium text-left">Transaction ID</th>
                    <th className="px-3 py-2 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {group.records.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-gray-700">{r.receiptNo}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {r.feeName}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{r.paymentMode ?? "DD"}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{fmtDate(r.paymentDate)}</td>
                      <td className="px-3 py-2 font-semibold text-right text-gray-800">
                        ₹{r.feeAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-500">{r.transactionId ?? "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); onView(r); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-white bg-primary border border-primary/30 hover:bg-primary/10 hover:text-primary transition"
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-semibold truncate text-text">{value}</p>
    </div>
  );
}

/** Used in the on-screen receipt preview info grid. */
function PRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-semibold leading-snug text-gray-800">{value}</p>
    </div>
  );
}