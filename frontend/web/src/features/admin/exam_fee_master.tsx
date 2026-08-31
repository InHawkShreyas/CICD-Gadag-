import { useState, useEffect, useMemo, useCallback, type ChangeEvent } from "react";
import {
  Plus,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  Pencil,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List as ListIcon,
  Search,
  X,
} from "lucide-react";

import FilterPanel from "../../components/ui/FilterPanel";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import SearchableSelect from "../../components/ui/SearchableSelect";
import Table from "../../components/ui/Table";
import Toast from "../../components/ui/Toast";
import Loader from "../../components/ui/Loader";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";
import AppLayout from "../../components/layouts/AppLayout";

import {
  type ExamFee,
  type ExamFeePayload,
  getExamFees,
  createExamFee,
  updateExamFee,
  setExamFeeStatus,
} from "../../services/examFeeService";
import { getDegrees, type Degree } from "../../services/degreeService";
import { getCourses, type Course } from "../../services/courseService";
import { getAcademicYears, type AcademicYear } from "../../services/academicYearService";

type ViewMode = "timeline" | "table";

const PAGE_SIZE = 10;

const EMPTY_FORM: ExamFeePayload = {
  degreeId: "",
  courseId: "",
  academicYearId: "",
  examFeeAmount: 0,
  platformCharges: 0,
  totalAmount: 0,
  startDate: "",
  endDate: "",
  fineEndDate: "",
  fineAmount: 0,
};

const EMPTY_FILTERS = {
  degree: [] as string[],
  course: [] as string[],
  academicYear: [] as string[],
};

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(amount: number | undefined) {
  return `₹${(amount ?? 0).toLocaleString("en-IN")}`;
}

function daysBetween(a: string, b: string) {
  const start = new Date(a).getTime();
  const end = new Date(b).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86400000));
}

/** Today as a yyyy-mm-dd string, used as the `min` for date pickers so past dates can't be picked. */
function todayStr() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

/** Total is always derived from the three amount fields — never edited directly. */
function withRecalculatedTotal(
  payload: ExamFeePayload,
  patch: Partial<Pick<ExamFeePayload, "examFeeAmount" | "platformCharges" | "fineAmount">>
): ExamFeePayload {
  const next = { ...payload, ...patch };
  return {
    ...next,
    totalAmount: next.examFeeAmount + next.platformCharges + next.fineAmount,
  };
}

/**
 * Whether the fine has actually kicked in *today*.
 * The fine only applies once the no-fine window (endDate) has passed —
 * up until then students should only owe exam fee + platform charges.
 * Comparison is done on calendar dates (midnight), not exact timestamps,
 * so the fine applies starting the day *after* endDate.
 */
function isFineActive(fee: { endDate: string }): boolean {
  if (!fee.endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(fee.endDate);
  end.setHours(0, 0, 0, 0);
  if (Number.isNaN(end.getTime())) return false;
  return today.getTime() > end.getTime();
}

/**
 * The amount actually payable *right now*: fine is only added once it has
 * kicked in. Before that, dues are just exam fee + platform charges, even
 * though `fee.totalAmount` (the configured/master total) already bakes the
 * fine in for record-keeping purposes.
 */
function effectivePayableAmount(fee: { examFeeAmount: number; platformCharges: number; fineAmount: number; endDate: string }): number {
  const base = fee.examFeeAmount + fee.platformCharges;
  return isFineActive(fee) ? base + fee.fineAmount : base;
}

/** Maps an ExamFee record into the editable payload shape used by both forms. */
function feeToPayload(fee: ExamFee): ExamFeePayload {
  return {
    degreeId: fee.degreeId,
    courseId: fee.courseId,
    academicYearId: fee.academicYearId,
    examFeeAmount: fee.examFeeAmount,
    platformCharges: fee.platformCharges,
    totalAmount: fee.totalAmount,
    startDate: fee.startDate?.slice(0, 10) ?? "",
    endDate: fee.endDate?.slice(0, 10) ?? "",
    fineEndDate: fee.fineEndDate?.slice(0, 10) ?? "",
    fineAmount: fee.fineAmount,
  };
}

function validateExamFeePayload(form: ExamFeePayload): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.degreeId) errors.degreeId = "Select a degree";
  if (!form.courseId) errors.courseId = "Select a course";
  if (!form.academicYearId) errors.academicYearId = "Select an academic year";
  if (form.examFeeAmount <= 0) errors.examFeeAmount = "Enter exam fee amount";
  if (form.platformCharges < 0) errors.platformCharges = "Cannot be negative";
  if (form.totalAmount < 0) errors.totalAmount = "Invalid amount";
  if (!form.startDate) errors.startDate = "Required";
  if (!form.endDate) errors.endDate = "Required";
  if (!form.fineEndDate) errors.fineEndDate = "Required";
  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    errors.endDate = "Must be on or after start date";
  }
  if (form.endDate && form.fineEndDate && form.fineEndDate < form.endDate) {
    errors.fineEndDate = "Must be on or after end date";
  }
  if (form.fineAmount < 0) errors.fineAmount = "Cannot be negative";
  return errors;
}

function StatusBadge({ active, size = "sm" }: { active: boolean; size?: "sm" | "md" }) {
  const padding = size === "md" ? "px-3 py-1" : "px-2.5 py-0.5";
  if (active) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${padding} text-xs font-semibold border rounded-full bg-emerald-50 text-emerald-700 border-emerald-200`}>
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-emerald-400" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
        </span>
        Active
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 ${padding} text-xs font-semibold border rounded-full bg-slate-100 text-slate-500 border-slate-200`}>
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Inactive
    </span>
  );
}

function FeePills({ fee }: { fee: ExamFee }) {
  const fineActive = isFineActive(fee);
  const payable = effectivePayableAmount(fee);
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100 rounded-full bg-blue-50">
        {formatCurrency(fee.examFeeAmount)}
      </span>
      <span
        className={`px-2 py-0.5 text-xs font-semibold border rounded-full ${fineActive
            ? "bg-amber-50 text-amber-700 border-amber-100"
            : "bg-slate-50 text-slate-400 border-slate-200 line-through"
          }`}
        title={fineActive ? "Fine has kicked in and is included in the total" : "Fine not applied yet — added automatically after the no-fine date"}
      >
        Fine {formatCurrency(fee.fineAmount)}
      </span>
      <span className="px-2 py-0.5 text-xs font-semibold border rounded-full bg-emerald-50 text-emerald-700 border-emerald-100">
        Payable now {formatCurrency(payable)}
      </span>
    </div>
  );
}

function WindowPills({ fee }: { fee: ExamFee }) {
  const fineActive = isFineActive(fee);
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 border border-slate-200">
        {formatDate(fee.startDate)}
      </span>
      <span className="self-center text-slate-300">→</span>
      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 border border-slate-200">
        {formatDate(fee.endDate)}
      </span>
      <span
        className={`px-2 py-0.5 text-xs rounded-full border ${fineActive
            ? "bg-amber-100 text-amber-800 border-amber-200 font-semibold"
            : "bg-amber-50 text-amber-700 border-amber-100"
          }`}
      >
        {fineActive ? "Fine active · till" : "Fine from"} {formatDate(fee.fineEndDate)}
      </span>
    </div>
  );
}

const inlineInputClass =
  "mt-0.5 w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40";
const inlineSelectClass =
  "w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary/40";

/**
 * Native date input used instead of the shared `Input` component for date
 * fields. `Input` doesn't reliably forward `min`/`max` to the underlying
 * <input>, which is required to grey out invalid dates in the calendar.
 */
function DateField({
  label,
  required,
  min,
  max,
  value,
  error,
  onChange,
}: {
  label: string;
  required?: boolean;
  min?: string;
  max?: string;
  value: string;
  error?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      <input
        type="date"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        className={`mt-1 w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 ${error ? "border-red-400" : "border-gray-200"
          }`}
      />
      {error && <span className="block mt-1 text-xs text-red-500">{error}</span>}
    </label>
  );
}

export default function ExamFeeMaster() {
  // ── Master data ──
  const [fees, setFees] = useState<ExamFee[]>([]);
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);

  // ── View state ──
  const [view, setView] = useState<ViewMode>("table");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // ── Modal (add / edit) form ──
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [form, setForm] = useState<ExamFeePayload>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ── Inline (in-row) edit ──
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState<ExamFeePayload>(EMPTY_FORM);
  const [inlineSaving, setInlineSaving] = useState(false);

  // Guards against rapid double-clicks firing the same status toggle twice
  // before the first request returns (which can otherwise queue up multiple
  // save calls for one click).
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Toast ──
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Initial data load ── */
  useEffect(() => {
    const loadData = async () => {
      try {
        const [degreeData, courseData, yearData] = await Promise.all([
          getDegrees(),
          getCourses(),
          getAcademicYears(),
        ]);
        setDegrees(degreeData);
        setAllCourses(courseData);
        setAcademicYears(yearData);

        try {
          setFees(await getExamFees());
        } catch (err) {
          console.error("getExamFees failed", err);
        }
      } catch (err) {
        console.error("Master data load failed", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /* ── Lookups ── */
  const degreeName = useCallback(
    (id: string) => degrees.find((d) => d.id === id)?.degreeName ?? "—",
    [degrees]
  );

  const courseName = useCallback(
    (id: string) => allCourses.find((c) => c.id === id)?.name ?? "—",
    [allCourses]
  );

  const yearName = useCallback(
    (id: string) => {
      const yr = academicYears.find((y) => y.id === id);
      if (!yr) return id || "—";
      return yr.description || `${yr.startDate ?? ""} – ${yr.endDate ?? ""}`;
    },
    [academicYears]
  );

  const courseOptionsFor = useCallback(
    (degreeId: string) =>
      degreeId ? allCourses.filter((c) => c.degreeId === degreeId) : allCourses,
    [allCourses]
  );

  /* ── Filtering, grouping & pagination ── */
  const filteredFees = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = fees.filter((f) => {
      const degreeMatch = filters.degree.length === 0 || filters.degree.includes(f.degreeId);
      const courseMatch = filters.course.length === 0 || filters.course.includes(f.courseId);
      const yearMatch =
        filters.academicYear.length === 0 || filters.academicYear.includes(f.academicYearId);

      const searchMatch =
        !q ||
        degreeName(f.degreeId).toLowerCase().includes(q) ||
        courseName(f.courseId).toLowerCase().includes(q) ||
        yearName(f.academicYearId).toLowerCase().includes(q);

      return degreeMatch && courseMatch && yearMatch && searchMatch;
    });

    // Soonest upcoming fine deadline first; fees without a fine date sink to the bottom.
    return [...matches].sort((a, b) => {
      const aTime = new Date(a.fineEndDate).getTime();
      const bTime = new Date(b.fineEndDate).getTime();
      const aValid = !Number.isNaN(aTime);
      const bValid = !Number.isNaN(bTime);
      if (!aValid && !bValid) return 0;
      if (!aValid) return 1;
      if (!bValid) return -1;
      return aTime - bTime;
    });
  }, [fees, filters, search, degreeName, courseName, yearName]);

  // Reset to page 1 whenever the result set changes underneath the user.
  useEffect(() => {
    setPage(1);
  }, [filters, search]);

  // After creating a record, jump to whichever page it actually landed on
  // post-sort, so the user can see what they just added.
  useEffect(() => {
    if (!lastCreatedId) return;
    const idx = filteredFees.findIndex((f) => f.id === lastCreatedId);
    if (idx !== -1) {
      setPage(Math.floor(idx / PAGE_SIZE) + 1);
    }
    setLastCreatedId(null);
  }, [filteredFees, lastCreatedId]);

  const totalPages = Math.max(1, Math.ceil(filteredFees.length / PAGE_SIZE));

  const paginatedFees = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredFees.slice(start, start + PAGE_SIZE);
  }, [filteredFees, page]);

  const groupedByYear = useMemo(() => {
    const map = new Map<string, ExamFee[]>();
    for (const fee of filteredFees) {
      const key = fee.academicYearId || "unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(fee);
    }
    return Array.from(map.entries());
  }, [filteredFees]);

  const activeFilterCount =
    filters.degree.length + filters.course.length + filters.academicYear.length;

  /**
   * The soonest active fee whose fine hasn't kicked in yet — i.e. the next
   * fine that's about to apply. Shown live next to the stat cards so staff
   * can see what's coming without opening the table.
   */
  const upcomingFine = useMemo(() => {
    const candidates = fees.filter((f) => f.status && f.endDate && !isFineActive(f));
    if (candidates.length === 0) return null;
    return [...candidates].sort(
      (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    )[0];
  }, [fees]);

  const filterSections = useMemo(
    () => [
      {
        key: "degree",
        title: "Degree",
        options: degrees.map((d) => ({ label: d.degreeName, value: d.id })),
      },
      {
        key: "course",
        title: "Course",
        options: courseOptionsFor(filters.degree[0] ?? "").map((c) => ({
          label: c.name,
          value: c.id,
        })),
      },
      {
        key: "academicYear",
        title: "Academic Year",
        options: academicYears.map((y) => ({
          label: y.description ?? `${formatDate(y.startDate ?? "")} - ${formatDate(y.endDate ?? "")}`,
          value: y.id,
        })),
      },
    ],
    [degrees, academicYears, filters.degree, courseOptionsFor]
  );

  /* ── Modal form handlers ── */
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (fee: ExamFee) => {
    setEditingId(fee.id);
    setForm(feeToPayload(fee));
    setFormErrors({});
    setModalOpen(true);
  };

  const updateFormAmount = (patch: Parameters<typeof withRecalculatedTotal>[1]) =>
    setForm((prev) => withRecalculatedTotal(prev, patch));

  const handleSave = async () => {
    const errors = validateExamFeePayload(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      if (editingId) {
        const currentStatus = fees.find((f) => f.id === editingId)?.status ?? true;
        const updated = await updateExamFee(editingId, form, currentStatus);
        // Merge local form over the API response — backend may return partial data.
        setFees((prev) =>
          prev.map((f) => (f.id === editingId ? { ...form, ...updated, totalAmount: form.totalAmount } : f))
        );
        showToast("Exam fee updated.", "success");
      } else {
        const created = await createExamFee(form);
        const merged = { ...form, ...created, totalAmount: form.totalAmount };

        if (!merged.id) {
          // Backend didn't return a usable id — local optimistic insert would
          // break list rendering/pagination, so fall back to a full refetch.
          setFees(await getExamFees());
        } else {
          setFees((prev) => [...prev, merged]);
          setLastCreatedId(merged.id);
        }
        showToast("Exam fee added.", "success");
      }
      setModalOpen(false);
    } catch {
      showToast(editingId ? "Couldn't update the fee." : "Couldn't add the fee.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Status toggle (optimistic) ── */
  const handleStatusToggle = async (fee: ExamFee) => {
    if (togglingId === fee.id) return; // already in flight — ignore extra clicks
    setTogglingId(fee.id);
    const nextStatus = !fee.status;
    setFees((prev) => prev.map((f) => (f.id === fee.id ? { ...f, status: nextStatus } : f)));
    try {
      const updated = await setExamFeeStatus(fee, nextStatus);
      // Merge the response over the existing row — don't let a partial
      // status-API response clobber fields edited in a previous save.
      setFees((prev) =>
        prev.map((f) => (f.id === fee.id ? { ...f, ...updated, status: nextStatus } : f))
      );
      showToast(nextStatus ? "Fee is now active" : "Fee has been disabled", "success");
    } catch {
      setFees((prev) => prev.map((f) => (f.id === fee.id ? { ...f, status: !nextStatus } : f)));
      showToast(nextStatus ? "Couldn't enable the fee" : "Couldn't disable the fee", "error");
    } finally {
      setTogglingId(null);
    }
  };

  /* ── Inline (in-row) edit handlers ── */
  const openInlineEdit = (fee: ExamFee) => {
    setInlineEditId(fee.id);
    setInlineForm(feeToPayload(fee));
  };

  const updateInlineAmount = (patch: Parameters<typeof withRecalculatedTotal>[1]) =>
    setInlineForm((prev) => withRecalculatedTotal(prev, patch));

  const handleInlineSave = async (feeId: string) => {
    setInlineSaving(true);
    try {
      const currentStatus = fees.find((f) => f.id === feeId)?.status ?? true;
      const updated = await updateExamFee(feeId, inlineForm, currentStatus);
      setFees((prev) =>
        prev.map((f) =>
          f.id === feeId ? { ...inlineForm, ...updated, totalAmount: inlineForm.totalAmount } : f
        )
      );
      setInlineEditId(null);
      showToast("Exam fee updated.", "success");
    } catch {
      showToast("Couldn't update the fee.", "error");
    } finally {
      setInlineSaving(false);
    }
  };

  /* ── Table columns ── */
  const columns = [
    {
      header: "Programme",
      accessor: "degreeId" as const,
      render: (f: ExamFee) =>
        inlineEditId === f.id ? (
          <div className="flex flex-col gap-2 py-1 min-w-[320px]">
            <select
              className={inlineSelectClass}
              value={inlineForm.degreeId}
              onChange={(e) =>
                setInlineForm((p) => ({ ...p, degreeId: e.target.value, courseId: "" }))
              }
            >
              <option value="">Select degree</option>
              {degrees.map((d) => (
                <option key={d.id} value={d.id}>{d.degreeName}</option>
              ))}
            </select>
            <select
              className={inlineSelectClass}
              value={inlineForm.courseId}
              onChange={(e) => setInlineForm((p) => ({ ...p, courseId: e.target.value }))}
            >
              <option value="">Select course</option>
              {courseOptionsFor(inlineForm.degreeId).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              className={inlineSelectClass}
              value={inlineForm.academicYearId}
              onChange={(e) => setInlineForm((p) => ({ ...p, academicYearId: e.target.value }))}
            >
              <option value="">Select year</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.description ?? `${y.startDate ?? ""} – ${y.endDate ?? ""}`}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-slate-800">{degreeName(f.degreeId)}</span>
            <span className="text-xs text-slate-500">{courseName(f.courseId)}</span>
            <span className="text-xs text-slate-400">{yearName(f.academicYearId)}</span>
          </div>
        ),
    },

    {
      header: "Fee Details",
      accessor: "totalAmount" as const,
      render: (f: ExamFee) =>
        inlineEditId === f.id ? (
          <div className="flex flex-col gap-2 py-1 min-w-[260px]">
            <label className="text-xs text-slate-500">
              Exam Fee (₹)
              <input
                type="number"
                min="0"
                className={inlineInputClass}
                value={inlineForm.examFeeAmount === 0 ? "" : inlineForm.examFeeAmount}
                placeholder="0"
                onChange={(e) => updateInlineAmount({ examFeeAmount: e.target.value === "" ? 0 : Number(e.target.value) })}
              />
            </label>
            <label className="text-xs text-slate-500">
              Platform Charges (₹)
              <input
                type="number"
                min="0"
                className={inlineInputClass}
                value={inlineForm.platformCharges === 0 ? "" : inlineForm.platformCharges}
                placeholder="0"
                onChange={(e) => updateInlineAmount({ platformCharges: e.target.value === "" ? 0 : Number(e.target.value) })}
              />
            </label>
            <label className="text-xs text-slate-500">
              Fine Amount (₹)
              <input
                type="number"
                min="0"
                className={inlineInputClass}
                value={inlineForm.fineAmount === 0 ? "" : inlineForm.fineAmount}
                placeholder="0"
                onChange={(e) => updateInlineAmount({ fineAmount: e.target.value === "" ? 0 : Number(e.target.value) })}
              />
            </label>
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500">Total</span>
              <span className="text-xs font-bold text-slate-800">{formatCurrency(inlineForm.totalAmount)}</span>
            </div>
          </div>
        ) : (
          <FeePills fee={f} />
        ),
    },

    {
      header: "Window",
      accessor: "startDate" as const,
      render: (f: ExamFee) =>
        inlineEditId === f.id ? (
          <div className="flex flex-col gap-2 py-1 min-w-[180px]">
            <label className="text-xs text-slate-500">
              Opens on
              <input
                type="date"
                className={inlineInputClass}
                min={todayStr()}
                value={inlineForm.startDate}
                onChange={(e) => setInlineForm((p) => ({ ...p, startDate: e.target.value }))}
              />
            </label>
            <label className="text-xs text-slate-500">
              No-fine ends
              <input
                type="date"
                className={inlineInputClass}
                min={todayStr()}
                value={inlineForm.endDate}
                onChange={(e) => setInlineForm((p) => ({ ...p, endDate: e.target.value }))}
              />
            </label>
            <label className="text-xs text-slate-500">
              Fine ends
              <input
                type="date"
                className={inlineInputClass}
                min={inlineForm.endDate || todayStr()}
                value={inlineForm.fineEndDate}
                onChange={(e) => setInlineForm((p) => ({ ...p, fineEndDate: e.target.value }))}
              />
            </label>
          </div>
        ) : (
          <WindowPills fee={f} />
        ),
    },

    {
      header: "Status",
      accessor: "status" as const,
      render: (f: ExamFee) => <StatusBadge active={f.status} />,
    },

    {
      header: "Actions",
      accessor: "id" as const,
      render: (f: ExamFee) =>
        inlineEditId === f.id ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleInlineSave(f.id)}
              disabled={inlineSaving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary text-primary hover:bg-primary hover:text-white transition disabled:opacity-50"
            >
              {inlineSaving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setInlineEditId(null)}
              disabled={inlineSaving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-500 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openInlineEdit(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary text-primary hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleStatusToggle(f)}
              disabled={togglingId === f.id}
              className={
                f.status
                  ? "px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 transition disabled:opacity-50"
                  : "px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition disabled:opacity-50"
              }
            >
              {f.status ? "Deactivate" : "Activate"}
            </button>
          </div>
        ),
    },
  ];

  /* ── Loading state ── */
  if (loading) {
    return (
      <AppLayout pageTitle="Manage Exam Fees">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader />
        </div>
      </AppLayout>
    );
  }

  const activeCount = fees.filter((f) => f.status).length;
  const inactiveCount = fees.length - activeCount;

  return (
    <AppLayout pageTitle="Exam Fee Master">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      <div className="px-4 py-8 mx-auto space-y-8 max-w-7xl sm:px-6 lg:px-8" data-testid="exam-fee-master">
        {/* ── Page header ── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white border shadow-sm rounded-xl border-slate-200">
              <span className="text-lg font-bold text-slate-800">{fees.length}</span>
              <span className="text-xs font-medium text-slate-500">Total Rules</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border shadow-sm rounded-xl bg-emerald-50 border-emerald-200">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-emerald-400" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-lg font-bold text-emerald-700">{activeCount}</span>
              <span className="text-xs font-medium text-emerald-600">Active</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border shadow-sm rounded-xl bg-slate-50 border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-lg font-bold text-slate-500">{inactiveCount}</span>
              <span className="text-xs font-medium text-slate-400">Inactive</span>
            </div>

            {upcomingFine && (
              <div className="flex items-center max-w-full gap-2 px-3 py-2 text-xs font-medium border rounded-full bg-amber-50 border-amber-200 text-amber-800">
                <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                <span className="truncate">
                  Upcoming fine: <span className="font-semibold">{degreeName(upcomingFine.degreeId)}</span> ·{" "}
                  {courseName(upcomingFine.courseId)} — {formatCurrency(upcomingFine.fineAmount)} from{" "}
                  {formatDate(upcomingFine.endDate)}
                </span>
              </div>
            )}
          </div>
          <Button
            variant="primary"
            onClick={openCreate}
            testId="btn-new-exam-fee"
            className="inline-flex items-center justify-center w-full gap-2 sm:w-auto whitespace-nowrap"
          >
            <Plus size={18} className="shrink-0" />
            New Exam Fee
          </Button>
        </div>

        {/* ── Toolbar: search, filters, view toggle ── */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={15} className="absolute -translate-y-1/2 pointer-events-none left-3 top-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by degree, course or year…"
                className="w-full py-2 pr-8 text-sm transition border rounded-lg pl-9 border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute -translate-y-1/2 right-2 top-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex items-center gap-1">
                <FilterPanel
                  sections={filterSections}
                  values={filters}
                  onChange={(key, values) => setFilters((prev) => ({ ...prev, [key]: values }))}
                />
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setFilters(EMPTY_FILTERS)}
                    className="flex items-center justify-center w-5 h-5 transition rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-500"
                    aria-label="Clear all filters"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 p-1.5 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => setView("table")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${view === "table"
                      ? "bg-white text-primary shadow-md border border-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  <ListIcon size={16} /> Table
                </button>
                <button
                  onClick={() => setView("timeline")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${view === "timeline"
                      ? "bg-white text-primary shadow-md border border-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  <LayoutGrid size={16} /> Timeline
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Empty state ── */}
        {filteredFees.length === 0 && (
          <Card className="border border-slate-200 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
            <EmptyState
              title="No exam fees added yet"
              description="Add your first exam fee to define when it opens, closes, and starts attracting a fine."
              actionLabel="New Exam Fee"
              onAction={openCreate}
            />
          </Card>
        )}

        {/* ── Timeline view ── */}
        {filteredFees.length > 0 && view === "timeline" && (
          <div className="space-y-8">
            {groupedByYear.map(([yearId, yearFees]) => (
              <div key={yearId} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-1 h-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                  <span className="text-sm font-bold tracking-wide text-gray-900 uppercase">
                    {yearName(yearId)}
                  </span>
                  <span className="flex-1 border-t-2 border-dashed border-slate-100" />
                  <span className="text-xs font-semibold text-slate-500 px-3 py-1.5 bg-slate-100/60 rounded-full">
                    {yearFees.length} {yearFees.length !== 1 ? "Rules" : "Rule"}
                  </span>
                </div>

                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {yearFees.map((fee) => {
                    const totalSpan = Math.max(1, daysBetween(fee.startDate, fee.fineEndDate));
                    const openPct = Math.min(100, (daysBetween(fee.startDate, fee.endDate) / totalSpan) * 100);

                    return (
                      <div
                        key={fee.id}
                        className={`group relative flex flex-col gap-4 p-6 rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-lg ${fee.status
                            ? "bg-white border-slate-200 hover:border-green-400/30 hover:bg-gradient-to-br hover:from-green-50/20 hover:to-white"
                            : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <div className="absolute top-4 right-4">
                          <StatusBadge active={fee.status} size="md" />
                        </div>

                        <div className="pr-20 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 transition-colors rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 shrink-0 group-hover:from-blue-200 group-hover:to-blue-100">
                              <GraduationCap size={16} className="text-blue-600" />
                            </span>
                            <span className="text-sm font-bold text-gray-900 truncate">{degreeName(fee.degreeId)}</span>
                          </div>
                          <div className="flex items-center gap-3 pl-11">
                            <BookOpen size={14} className="text-slate-400 shrink-0" />
                            <span className="text-xs font-medium text-slate-600 line-clamp-2">{courseName(fee.courseId)}</span>
                          </div>
                        </div>

                        <div className="pl-11">
                          <FeePills fee={fee} />
                        </div>

                        <div className="space-y-2.5 pl-11">
                          <div className="relative h-3 overflow-hidden rounded-full shadow-inner bg-slate-100">
                            <div
                              className="absolute inset-y-0 left-0 transition-all duration-300 rounded-l-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                              style={{ width: `${openPct}%` }}
                            />
                            <div
                              className="absolute inset-y-0 transition-all duration-300 rounded-r-full bg-gradient-to-r from-amber-400 to-amber-500"
                              style={{ left: `${openPct}%`, right: 0 }}
                            />
                          </div>
                          <div className="flex justify-between text-xs font-semibold text-slate-600">
                            <span>{formatDate(fee.startDate)}</span>
                            <span className="text-emerald-600">{formatDate(fee.endDate)}</span>
                          </div>
                        </div>

                        <div
                          className={`flex items-center gap-3 py-3 pr-4 border rounded-xl pl-11 ${isFineActive(fee)
                              ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
                              : "bg-slate-50 border-slate-200"
                            }`}
                        >
                          <AlertTriangle size={14} className={isFineActive(fee) ? "text-amber-600 shrink-0" : "text-slate-400 shrink-0"} />
                          <span className={`text-xs font-semibold ${isFineActive(fee) ? "text-amber-900" : "text-slate-500"}`}>
                            {isFineActive(fee)
                              ? `Fine applied: ${formatCurrency(fee.fineAmount)} • Until ${formatDate(fee.fineEndDate)}`
                              : `Fine ${formatCurrency(fee.fineAmount)} applies from ${formatDate(fee.endDate)}`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t pl-11 border-slate-100/60">
                          <button
                            type="button"
                            onClick={() => openEdit(fee)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                            aria-label="Edit exam fee"
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          {fee.status ? (
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(fee)}
                              disabled={togglingId === fee.id}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                              aria-label="Deactivate exam fee"
                            >
                              <XCircle size={13} /> Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(fee)}
                              disabled={togglingId === fee.id}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-50"
                              aria-label="Activate exam fee"
                            >
                              <CheckCircle2 size={13} /> Activate
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Table view ── */}
        {filteredFees.length > 0 && view === "table" && (
          <Card className="p-0 overflow-hidden border shadow-sm rounded-2xl border-slate-200">
            <div className="flex items-start gap-2 px-4 pt-2 pb-2 text-sm font-semibold text-blue-800">
              <AlertTriangle size={15} strokeWidth={2.75} className="text-blue-700 mt-0.5 shrink-0" />
              <span className="font-semibold">
                Note : Fine is <span className="font-bold">not</span> added right now. It will be added to "Payable now" automatically once the due date is over.
              </span>
            </div>
            <Table columns={columns} data={paginatedFees} testId="exam-fee-table" />
            {totalPages > 1 && (
              <div className="px-4 pb-4">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Exam Fee" : "Add Exam Fee"}
        size="lg"
        testId="exam-fee-modal"
      >
        <div className="space-y-6">
          {/* Programme */}
          <div>
            <p className="mb-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Programme</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SearchableSelect
                label="Degree"
                required
                options={degrees.map((d) => ({ label: d.degreeName, value: d.id }))}
                value={form.degreeId}
                placeholder="Select degree"
                error={formErrors.degreeId}
                onChange={(val) => setForm((prev) => ({ ...prev, degreeId: String(val), courseId: "" }))}
              />
              <SearchableSelect
                label="Course"
                required
                options={courseOptionsFor(form.degreeId).map((c) => ({ label: c.name, value: c.id }))}
                value={form.courseId}
                placeholder={form.degreeId ? "Select course" : "Select a degree first"}
                error={formErrors.courseId}
                onChange={(val) => setForm((prev) => ({ ...prev, courseId: String(val) }))}
              />
            </div>
          </div>

          {/* Classification & amounts */}
          <div>
            <p className="mb-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Classification</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Academic Year"
                required
                options={academicYears.map((y) => ({
                  label: y.description || `${y.startDate ?? ""} – ${y.endDate ?? ""}`,
                  value: y.id,
                }))}
                value={form.academicYearId}
                placeholder="Select academic year"
                error={formErrors.academicYearId}
                onChange={(e) => setForm((prev) => ({ ...prev, academicYearId: e.target.value }))}
              />
              <Input
                label="Exam Fee Amount (₹)"
                type="number"
                required
                min="0"
                value={String(form.examFeeAmount)}
                error={formErrors.examFeeAmount}
                onChange={(e) => updateFormAmount({ examFeeAmount: Number(e.target.value) || 0 })}
              />
              <Input
                label="Platform Charges (₹)"
                type="number"
                min="0"
                value={String(form.platformCharges)}
                error={formErrors.platformCharges}
                onChange={(e) => updateFormAmount({ platformCharges: Number(e.target.value) || 0 })}
              />
              <Input label="Total Amount (₹)" type="number" value={String(form.totalAmount)} disabled />
            </div>
          </div>

          {/* Fee window */}
          <div className="p-4 space-y-3 border border-gray-200 border-dashed rounded-xl bg-gray-50/60">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Fee Window</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DateField
                label="Opens on"
                required
                min={todayStr()}
                value={form.startDate}
                error={formErrors.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
              />
              <DateField
                label="No-fine ends on"
                required
                min={todayStr()}
                value={form.endDate}
                error={formErrors.endDate}
                onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
              />
              <DateField
                label="Fine window ends on"
                required
                min={form.endDate || todayStr()}
                value={form.fineEndDate}
                error={formErrors.fineEndDate}
                onChange={(e) => setForm((prev) => ({ ...prev, fineEndDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Fine amount */}
          <div className="flex items-start gap-3 px-4 py-3 border rounded-xl border-amber-100 bg-amber-50/60">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <Input
                label="Fine amount (₹)"
                type="number"
                step="1"
                min="0"
                required
                value={String(form.fineAmount)}
                error={formErrors.fineAmount}
                onChange={(e) => updateFormAmount({ fineAmount: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Add fee"}
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}