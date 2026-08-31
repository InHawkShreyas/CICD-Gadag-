import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Search, X, IndianRupee, ExternalLink, Undo2, ChevronDown, ChevronRight } from "lucide-react";
import FilterPanel from "../../components/ui/FilterPanel";
import Pagination from "../../components/ui/Pagination";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Toast from "../../components/ui/Toast";
import AppLayout from "../../components/layouts/AppLayout";
import Loader from "../../components/ui/Loader";
import {
  getPagedFeeCollections,
  getFeeTypes,
  updateRefund,
  type FeeCollectionResponse,
} from "../../services/feeCollectionService";
import { getCourseDetailsByApplicationId } from "../../services/applicationCourseDetailService";
import { getAcademicYears, type AcademicYear } from "../../services/academicYearService";
import { getFullApplicationByAppNo } from "../../services/applicationQueryService";
import { getDegrees } from "../../services/degreeService";
import { getLookupsByType } from "../../services/lookupService";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const STATUS_BADGE: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  refund: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
};
const statusBadgeClass = (status?: string) =>
  STATUS_BADGE[(status ?? "").toLowerCase()] ?? "bg-gray-100 text-gray-600";

const FEE_TYPE_BADGE = (feeType?: string) => {
  const t = (feeType ?? "").toLowerCase();
  if (t.includes("admission")) return "bg-purple-100 text-purple-700";
  if (t.includes("application")) return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
};

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
// itself rather than "order first seen" — needed now that each page only
// shows a slice of groups, so the same year should always get the same
// color regardless of which page it happens to appear on.
function colorForYear(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return YEAR_COLOR_PALETTE[hash % YEAR_COLOR_PALETTE.length];
}

type FeeGroup = {
  key: string;
  applicationId: string;
  applicationNo: string;
  studentName: string;
  records: FeeCollectionResponse[];
  totalPaid: number;
  hasRefund: boolean;
  hasPending: boolean;
  hasFailed: boolean;
  hasSuccess: boolean;
  latestPaymentDate?: string;
  academicYearDesc: string | null;
  batchYear: string | null;
  isCertificateCourse: boolean;
  batchTypeLabel: string | null;
};

function groupByApplication(
  records: FeeCollectionResponse[],
  batchIdByApplicationId: Map<string, string | null | undefined>,
  academicYearIdByApplicationId: Map<string, string | null | undefined>,
  academicYears: AcademicYear[],
  isCertByApplicationId: Map<string, boolean>,
  batchTypeLabelByApplicationId: Map<string, string | null | undefined>,
  batchIdByCourseKey: Map<string, string | null | undefined>,
  isCertByCourseKey: Map<string, boolean>,
  batchTypeLabelByCourseKey: Map<string, string | null | undefined>
): FeeGroup[] {
  const groups = new Map<string, FeeGroup>();

  for (const r of records) {
    const key = r.applicationNo || `app-${r.id}`;
    let group = groups.get(key);
    if (!group) {
      const recordCourseId = (r as unknown as { courseId?: string }).courseId;
      const courseKey = recordCourseId ? `${r.applicationId}::${recordCourseId}` : null;

      const batchId = (courseKey && batchIdByCourseKey.get(courseKey)) ?? batchIdByApplicationId.get(r.applicationId);
      const batchMatch = batchId ? academicYears.find((y) => y.id === batchId) : undefined;

      const currentAcademicYearId = academicYearIdByApplicationId.get(r.applicationId);
      const currentYearMatch = currentAcademicYearId
        ? academicYears.find((y) => y.id === currentAcademicYearId)
        : undefined;

      const isCertCourse =
        (courseKey ? isCertByCourseKey.get(courseKey) : undefined) ?? isCertByApplicationId.get(r.applicationId) ?? false;

      // Certificate courses don't carry a batchId (only batchTypeId), so the
      // normal batch-year resolution never has anything to match against —
      // mirrors the hardcoded fallback in fee_reciept.tsx for this same reason.
      const batchYearValue = isCertCourse
        ? "2025-2026"
        : batchMatch?.batchYear ?? currentYearMatch?.batchYear;

      const batchTypeLabel = isCertCourse
        ? ((courseKey && batchTypeLabelByCourseKey.get(courseKey)) ?? batchTypeLabelByApplicationId.get(r.applicationId) ?? null)
        : null;

      group = {
        key,
        applicationId: r.applicationId,
        applicationNo: r.applicationNo ?? "—",
        studentName: r.name ?? "—",
        records: [],
        totalPaid: 0,
        hasRefund: false,
        hasPending: false,
        hasFailed: false,
        hasSuccess: false,
        latestPaymentDate: undefined,
        academicYearDesc: currentYearMatch?.description ?? null,
        batchYear: batchYearValue ? `${batchYearValue}` : null,
        isCertificateCourse: isCertCourse,
        batchTypeLabel,
      };
      groups.set(key, group);
    }

    group.records.push(r);

    const status = (r.status ?? "").toUpperCase();
    if (status === "SUCCESS") { group.totalPaid += r.paidAmount ?? 0; group.hasSuccess = true; }
    if (status === "REFUND") group.hasRefund = true;
    if (status === "PENDING") group.hasPending = true;
    if (status === "FAILED") group.hasFailed = true;

    if (r.paymentDate && (!group.latestPaymentDate || r.paymentDate > group.latestPaymentDate)) {
      group.latestPaymentDate = r.paymentDate;
    }
  }

  // Most recent activity first
  return [...groups.values()].sort((a, b) =>
    (b.latestPaymentDate ?? "").localeCompare(a.latestPaymentDate ?? "")
  );
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function FeeCollectionPage() {
  // Server already returns this page's group's rows — no client-side slicing needed.
  const [pageRecords, setPageRecords] = useState<FeeCollectionResponse[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [totals, setTotals] = useState({ total: 0, appFees: 0, admFees: 0 });
  const [feeTypeOptionsRaw, setFeeTypeOptionsRaw] = useState<string[]>([]);

  // firstPageReady: first page of fee records has arrived — this is the ONLY
  // thing the full-page spinner waits on now. Academic-year/batch-year/batch-type
  // columns are enrichment: they render as "—" until their data lands, then
  // fill in in place. Don't gate the table on them — they used to be a
  // full-table fetch and were the real reason the page felt slow even after
  // the summary cards got fast.
  const [firstPageReady, setFirstPageReady] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const loading = !firstPageReady;

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({ feeType: [] });
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [batchIdByApplicationId, setBatchIdByApplicationId] = useState<Map<string, string | null | undefined>>(new Map());
  const [academicYearIdByApplicationId, setAcademicYearIdByApplicationId] = useState<Map<string, string | null | undefined>>(new Map());
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [batchLookups, setBatchLookups] = useState<{ id: string; name?: string }[]>([]);
  const [degreeNameById, setDegreeNameById] = useState<Map<string, string>>(new Map());
  const [isCertByApplicationId, setIsCertByApplicationId] = useState<Map<string, boolean>>(new Map());
  const [batchTypeLabelByApplicationId, setBatchTypeLabelByApplicationId] = useState<Map<string, string | null | undefined>>(new Map());
  const [batchIdByCourseKey, setBatchIdByCourseKey] = useState<Map<string, string | null | undefined>>(new Map());
  const [isCertByCourseKey, setIsCertByCourseKey] = useState<Map<string, boolean>>(new Map());
  const [batchTypeLabelByCourseKey, setBatchTypeLabelByCourseKey] = useState<Map<string, string | null | undefined>>(new Map());

  /* Refund modal */
  const [refundTarget, setRefundTarget] = useState<FeeCollectionResponse | null>(null);
  const [refundId, setRefundId] = useState("");
  const [refundDate, setRefundDate] = useState("");
  const [savingRefund, setSavingRefund] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const openRefundModal = useCallback((record: FeeCollectionResponse) => {
    setRefundTarget(record);
    setRefundId("");
    setRefundDate("");
  }, []);

  const closeRefundModal = useCallback(() => {
    setRefundTarget((prev) => (savingRefund ? prev : null));
  }, [savingRefund]);

  const handleSaveRefund = useCallback(async () => {
    if (!refundTarget?.receiptNumber) return;

    if (!refundId.trim() || !refundDate) {
      showToast("Refund ID and refund date are required.", "error");
      return;
    }

    setSavingRefund(true);
    try {
      const isoRefundDate = new Date(refundDate).toISOString();
      await updateRefund({
        receiptNumber: refundTarget.receiptNumber,
        refundId: refundId.trim(),
        refundDate: isoRefundDate,
        status: "REFUND",
      });

      setPageRecords((prev) =>
        prev.map((r) =>
          r.id === refundTarget.id
            ? { ...r, status: "REFUND", refundId: refundId.trim(), refundDate: isoRefundDate }
            : r
        )
      );

      showToast("Refund recorded successfully.", "success");
      setRefundTarget(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg ?? "Failed to record refund.", "error");
    } finally {
      setSavingRefund(false);
    }
  }, [refundTarget, refundId, refundDate, showToast]);

  /* ── Debounce the search box so we don't fire a request per keystroke ── */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ── Small/static lookups — genuinely bounded lists, fine to load once at mount ── */
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAcademicYears().catch(() => []),
      getLookupsByType("Batch", "").catch(() => []),
      getDegrees().catch(() => []), // ✅ one bulk fetch instead of one call per unique degree
      getFeeTypes().catch(() => []),
    ]).then(([years, lookups, degrees, feeTypes]) => {
      if (cancelled) return;
      setAcademicYears(years);
      setFeeTypeOptionsRaw(feeTypes);
      setBatchLookups(lookups);
      setDegreeNameById(new Map(degrees.map((d) => [d.id, d.degreeName ?? ""])));
    }).catch(console.error);
    return () => { cancelled = true; };
  }, []);

  /* ── Course-detail + academic-year enrichment — scoped to ONLY the applications
     on the current page (bounded to pageSize, run in parallel), instead of
     fetching the whole applicationCourseDetail table or every application in the
     system like before. getFullApplicationByAppNo returns a lot more than we need
     (course details, documents, fee payments, verification…) per call, but bounded
     to ~10 concurrent calls for the current page it's still far cheaper than the
     old filterApplications({}) which returned that same heavy shape for every
     application system-wide. This was the actual cause of the table staying slow
     even after the summary cards got fast. ── */
  useEffect(() => {
    const applicationIds = [...new Set(pageRecords.map((r) => r.applicationId))];
    const appNos = [...new Set(pageRecords.map((r) => r.applicationNo).filter((n): n is string => !!n))];
    if (applicationIds.length === 0) return;

    let cancelled = false;
    Promise.all([
      Promise.all(applicationIds.map((id) => getCourseDetailsByApplicationId(id).catch(() => []))),
      Promise.all(appNos.map((appNo) => getFullApplicationByAppNo(appNo).catch(() => null))),
    ]).then(([courseDetailResults, applicationResults]) => {
      if (cancelled) return;
      const courseDetails = courseDetailResults.flat();

      setAcademicYearIdByApplicationId((prev) => {
        const next = new Map(prev);
        for (const res of applicationResults) {
          if (res?.application) next.set(res.application.id, res.application.academicYearId);
        }
        return next;
      });

      setBatchIdByApplicationId((prev) => {
        const next = new Map(prev);
        for (const cd of courseDetails) next.set(cd.applicationId, cd.batchId);
        return next;
      });
      setBatchIdByCourseKey((prev) => {
        const next = new Map(prev);
        for (const cd of courseDetails) next.set(`${cd.applicationId}::${cd.courseId}`, cd.batchId);
        return next;
      });

      const isCertMap = new Map(isCertByApplicationId);
      const batchTypeLabelMap = new Map(batchTypeLabelByApplicationId);
      const isCertByCourseMap = new Map(isCertByCourseKey);
      const batchTypeLabelByCourseMap = new Map(batchTypeLabelByCourseKey);
      for (const cd of courseDetails) {
        const isCert = (degreeNameById.get(cd.degreeId) ?? "").toLowerCase().includes("certificate");
        const courseKey = `${cd.applicationId}::${cd.courseId}`;
        isCertMap.set(cd.applicationId, isCert);
        isCertByCourseMap.set(courseKey, isCert);
        if (isCert && cd.batchTypeId) {
          const batchTypeLookup = batchLookups.find((b) => b.id === cd.batchTypeId);
          if (batchTypeLookup?.name) {
            batchTypeLabelMap.set(cd.applicationId, batchTypeLookup.name);
            batchTypeLabelByCourseMap.set(courseKey, batchTypeLookup.name);
          }
        }
      }
      if (cancelled) return;
      setIsCertByApplicationId(isCertMap);
      setBatchTypeLabelByApplicationId(batchTypeLabelMap);
      setIsCertByCourseKey(isCertByCourseMap);
      setBatchTypeLabelByCourseKey(batchTypeLabelByCourseMap);
    }).catch(console.error);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageRecords, degreeNameById, batchLookups]);

  /* ── Reset to page 1 + collapse rows whenever the query changes ── */
  useEffect(() => {
    setExpandedKeys(new Set());
    setPage(1);
  }, [debouncedSearch, filters]);

  /* ── Paged fee records — the only thing that refetches per page/search/filter ── */
  useEffect(() => {
    let cancelled = false;
    setTableLoading(true);
    getPagedFeeCollections({
      search: debouncedSearch || undefined,
      feeType: filters.feeType.length ? filters.feeType : undefined,
      page,
      pageSize,
    })
      .then((res) => {
        if (cancelled) return;
        setPageRecords(res.items);
        setTotalGroups(res.totalGroups);
        setTotals({
          total: res.totals.total,
          appFees: res.totals.applicationFees,
          admFees: res.totals.admissionFees,
        });
      })
      .catch(console.error)
      .finally(() => {
        if (cancelled) return;
        setTableLoading(false);
        setFirstPageReady(true);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters, page]);

  const feeTypeOptions = useMemo(
    () => feeTypeOptionsRaw.map((t) => ({ label: t, value: t })),
    [feeTypeOptionsRaw]
  );

  const filterSections = useMemo(
    () => [{ title: "Fee Type", key: "feeType", options: feeTypeOptions }],
    [feeTypeOptions]
  );

  const groupedRows = useMemo(
    () =>
      groupByApplication(
        pageRecords,
        batchIdByApplicationId,
        academicYearIdByApplicationId,
        academicYears,
        isCertByApplicationId,
        batchTypeLabelByApplicationId,
        batchIdByCourseKey,
        isCertByCourseKey,
        batchTypeLabelByCourseKey
      ),
    [
      pageRecords,
      batchIdByApplicationId,
      academicYearIdByApplicationId,
      academicYears,
      isCertByApplicationId,
      batchTypeLabelByApplicationId,
      batchIdByCourseKey,
      isCertByCourseKey,
      batchTypeLabelByCourseKey,
    ]
  );

  const yearColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of groupedRows) {
      const label = group.academicYearDesc;
      if (label && !map.has(label)) {
        map.set(label, colorForYear(label));
      }
    }
    return map;
  }, [groupedRows]);

  const totalPages = Math.max(1, Math.ceil(totalGroups / pageSize));
  const hasActiveFilter = !!searchQuery || filters.feeType.length > 0;

  const toggleGroup = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return (
    <AppLayout pageTitle="Fee Collection">
      <div data-testid="fee-collection-page" className="pb-8 space-y-4" style={{ zoom: 0.9 }}>

        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold text-text">Fee Collection</h1>
          <p className="text-base text-gray-500">All fee payments collected from students.</p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard testId="card-total-collected" icon={<IndianRupee size={18} className="text-primary" />} iconBg="bg-primary/10" label="Total Collected" value={fmt(totals.total)} />
          <SummaryCard icon={<IndianRupee size={18} className="text-blue-600" />} iconBg="bg-blue-100" label="Application Fees" value={fmt(totals.appFees)} />
          <SummaryCard icon={<IndianRupee size={18} className="text-purple-600" />} iconBg="bg-purple-100" label="Admission Fees" value={fmt(totals.admFees)} />
        </div>

        {/* SEARCH + FILTER */}
        <div className="p-4 bg-white border rounded-lg">
          <div className="flex flex-col items-end gap-3 sm:flex-row">
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="absolute text-gray-400 -translate-y-1/2 pointer-events-none left-3 top-1/2" />
              <input
                data-testid="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, app no., receipt, or TXN ID…"
                className="w-full py-2 pl-8 pr-8 text-base transition-colors bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                  <X size={12} />
                </button>
              )}
            </div>

            <FilterPanel
              sections={filterSections}
              values={filters}
              onChange={(key, values) => setFilters((prev) => ({ ...prev, [key]: values }))}
            />

            {hasActiveFilter && (
              <Button variant="outline" onClick={() => { setSearchQuery(""); setFilters({ feeType: [] }); }}>
                Clear
              </Button>
            )}
          </div>

          <p className="mt-3 text-sm text-gray-400">
            Showing {groupedRows.length} application{groupedRows.length === 1 ? "" : "s"} on this page ({totalGroups} total)
          </p>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="py-16"><Loader /></div>
        ) : groupedRows.length === 0 ? (
          <div className="p-12 text-center bg-white border rounded-lg">
            <Search size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-base font-semibold text-gray-600">No records found</p>
            <p className="mt-1 text-sm text-gray-400">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="relative pb-2 overflow-hidden bg-white border rounded-lg">
            {tableLoading && (
              <div className="absolute inset-0 z-10 flex items-start justify-center pt-10 bg-white/60">
                <Loader />
              </div>
            )}
            {yearColorMap.size > 0 && (
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b bg-gray-50">
                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Academic Year</span>
                {[...yearColorMap.entries()].map(([label, colorClass]) => (
                  <span
                    key={label}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
            <FeeGroupTable
              groups={groupedRows}
              expandedKeys={expandedKeys}
              onToggle={toggleGroup}
              onRefund={openRefundModal}
              yearColorMap={yearColorMap}
            />
            {totalGroups > pageSize && (
              <div className="px-4">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}

      </div>

      {/* REFUND MODAL */}
      <Modal
        open={!!refundTarget}
        title="Record Refund"
        onClose={closeRefundModal}
        size="sm"
        testId="refund-modal"
      >
        {refundTarget && (
          <div className="space-y-4">
            <div className="p-3 space-y-1 text-base border rounded-lg bg-gray-50">
              <div className="flex justify-between">
                <span className="text-gray-400">Receipt No.</span>
                <span className="font-mono font-semibold text-gray-700">{refundTarget.receiptNumber ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Student</span>
                <span className="font-medium text-gray-700">{refundTarget.name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount Paid</span>
                <span className="font-semibold text-emerald-700">{fmt(refundTarget.paidAmount)}</span>
              </div>
            </div>

            <div>
              <label className="block text-base font-medium text-gray-600 mb-1.5">
                Refund ID <span className="text-red-500">*</span>
              </label>
              <input
                data-testid="input-refund-id"
                value={refundId}
                onChange={(e) => setRefundId(e.target.value)}
                placeholder="Enter refund reference / transaction ID"
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-600 mb-1.5">
                Refund Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                data-testid="input-refund-date"
                value={refundDate}
                onChange={(e) => setRefundDate(e.target.value)}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={closeRefundModal} disabled={savingRefund}>
                Cancel
              </Button>
              <Button
                testId="btn-save-refund"
                onClick={handleSaveRefund}
                disabled={savingRefund}
              >
                {savingRefund ? "Saving…" : "Save Refund"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {toast && (
        <div className="fixed top-5 right-5 z-[60]">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}
    </AppLayout>
  );
}

/* ─── Summary card ───────────────────────────────────────────────────────── */

function SummaryCard({
  icon, iconBg, label, value, testId,
}: { icon: React.ReactNode; iconBg: string; label: string; value: string; testId?: string }) {
  return (
    <div data-testid={testId} className="flex items-center gap-4 p-5 bg-white border rounded-lg">
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-text">{value}</p>
      </div>
    </div>
  );
}

/* ─── Grouped table ───────────────────────────────────────────────────────── */

function FeeGroupTable({
  groups, expandedKeys, onToggle, onRefund, yearColorMap,
}: {
  groups: FeeGroup[];
  expandedKeys: Set<string>;
  onToggle: (key: string) => void;
  onRefund: (record: FeeCollectionResponse) => void;
  yearColorMap: Map<string, string>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-base">
        <thead className="text-white bg-primary">
          <tr>
            <th className="w-8 px-4 py-2 text-base font-semibold text-left"></th>
            <th className="px-4 py-2 text-base font-semibold text-left">Application No.</th>
            <th className="px-4 py-2 text-base font-semibold text-left">Student Name</th>
            <th className="px-4 py-2 text-base font-semibold text-left">Academic Year</th>
            <th className="px-4 py-2 text-base font-semibold text-left">Batch Year</th>
            <th className="px-4 py-2 text-base font-semibold text-left">Batch Type</th>
            <th className="px-4 py-2 text-base font-semibold text-left">Receipts</th>
            <th className="px-4 py-2 text-base font-semibold text-left">Total Paid</th>
            <th className="px-4 py-2 text-base font-semibold text-left">Last Payment</th>
            <th className="px-4 py-2 text-base font-semibold text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const isOpen = expandedKeys.has(group.key);
            return (
              <FeeGroupRows
                key={group.key}
                group={group}
                isOpen={isOpen}
                onToggle={() => onToggle(group.key)}
                onRefund={onRefund}
                yearColorMap={yearColorMap}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FeeGroupRows({
  group, isOpen, onToggle, onRefund, yearColorMap,
}: {
  group: FeeGroup;
  isOpen: boolean;
  onToggle: () => void;
  onRefund: (record: FeeCollectionResponse) => void;
  yearColorMap: Map<string, string>;
}) {
  const yearColorClass = group.academicYearDesc
    ? (yearColorMap.get(group.academicYearDesc) ?? "bg-gray-100 text-gray-600 border-gray-200")
    : null;

  return (
    <>
      <tr
        className="transition border-t cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <td className="px-4 py-2.5 text-gray-400">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </td>
        <td className="px-4 py-2.5 font-semibold text-primary">{group.applicationNo}</td>
        <td className="px-4 py-2.5 font-medium text-gray-800">{group.studentName}</td>
        <td className="px-4 py-2.5">
          {group.academicYearDesc ? (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold border ${yearColorClass}`}>
              {group.academicYearDesc}
            </span>
          ) : (
            <span className="text-sm text-gray-300">—</span>
          )}
        </td>
        <td className="px-4 py-2.5">
          {group.batchYear ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold border text-teal-700 bg-teal-50 border-teal-200">
              {group.batchYear}
            </span>
          ) : (
            <span className="text-sm text-gray-300">—</span>
          )}
        </td>
        <td className="px-4 py-2.5">
          {group.isCertificateCourse && group.batchTypeLabel ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold border text-indigo-700 bg-indigo-50 border-indigo-200">
              {group.batchTypeLabel}
            </span>
          ) : (
            <span className="text-sm text-gray-300">—</span>
          )}
        </td>
        <td className="px-4 py-2.5 text-gray-600">{group.records.length}</td>
        <td className="px-4 py-2.5 font-semibold text-emerald-700">{fmt(group.totalPaid)}</td>
        <td className="px-4 py-2.5 text-gray-600">{formatDate(group.latestPaymentDate)}</td>
        <td className="px-4 py-2.5">
          <div className="flex gap-1.5 flex-wrap">
            {group.hasSuccess && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass("success")}`}>Success</span>}
            {group.hasRefund && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass("refund")}`}>Refund</span>}
            {!group.hasSuccess && group.hasPending && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass("pending")}`}>Pending</span>}
            {!group.hasSuccess && group.hasFailed && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass("failed")}`}>Failed</span>}
            {!group.hasSuccess && !group.hasRefund && !group.hasPending && !group.hasFailed && (
              <span className="text-sm text-gray-300">—</span>
            )}
          </div>
        </td>
      </tr>

      {isOpen && (
        <tr className="border-t bg-gray-50/60">
          <td colSpan={10} className="px-4 py-3">
            <div className="overflow-hidden bg-white border rounded-lg">
              <table className="w-full text-sm">
                <thead className="text-gray-500 bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 font-medium text-left">Receipt No.</th>
                    <th className="px-3 py-2 font-medium text-left">Fee Type</th>
                    <th className="px-3 py-2 font-medium text-left">Amount</th>
                    <th className="px-3 py-2 font-medium text-left">Paid</th>
                    <th className="px-3 py-2 font-medium text-left">Payment Date</th>
                    <th className="px-3 py-2 font-medium text-left">Transaction ID</th>
                    <th className="px-3 py-2 font-medium text-left">Status</th>
                    <th className="px-3 py-2 font-medium text-left">Receipt</th>
                    <th className="px-3 py-2 font-medium text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {group.records.map((r) => {
                    const isSuccess = (r.status ?? "").toUpperCase() === "SUCCESS";
                    return (
                      <tr key={r.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-600">{r.receiptNumber ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${FEE_TYPE_BADGE(r.feeType)}`}>
                            {r.feeType ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2">{fmt(r.amount)}</td>
                        <td className="px-3 py-2 font-semibold text-emerald-700">{fmt(r.paidAmount)}</td>
                        <td className="px-3 py-2 text-gray-600">{formatDate(r.paymentDate)}</td>
                        <td className="px-3 py-2 font-mono text-gray-500" title={r.transactionId}>
                          {r.transactionId
                            ? (r.transactionId.length > 12 ? `${r.transactionId.slice(0, 12)}…` : r.transactionId)
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass(r.status)}`}>
                            {r.status ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {isSuccess && r.receiptNumber ? (
                            <a
                              href={`/admin/fee-receipt?receipt=${r.receiptNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-primary border border-primary/30 hover:bg-primary/10 transition"
                            >
                              <ExternalLink size={10} />
                              View
                            </a>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          {isSuccess ? (
                            <Button
                              variant="outline"
                              className="!py-1 !px-2 text-xs"
                              onClick={() => onRefund(r)}
                            >
                              <Undo2 size={10} />
                              Refund
                            </Button>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}