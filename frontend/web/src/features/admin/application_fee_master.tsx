import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  BookOpen,
  Tag,
  Search,
  X,
  Wallet,
  ChevronDown,
  ChevronRight,
  Info,
  AlertTriangle,
} from "lucide-react";

import FilterPanel from "../../components/ui/FilterPanel";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Toast from "../../components/ui/Toast";
import Loader from "../../components/ui/Loader";
import EmptyState from "../../components/ui/EmptyState";
import AppLayout from "../../components/layouts/AppLayout";

import {
  type ApplicationFee,
  type ApplicationFeePayload,
  type ApplicationFeeBulkPayload,
  getApplicationFees,
  bulkCreateApplicationFees,
  updateApplicationFee,
  setApplicationFeeStatus,
} from "../../services/applicationFeeService";
import { getDegrees, type Degree } from "../../services/degreeService";
import { getCourses, type Course } from "../../services/courseService";
import { getAcademicYears, type AcademicYear } from "../../services/academicYearService";
import { getLookupsByType } from "../../services/lookupService";
import AddFormMultiSelect from "../../components/ui/MultiselectDropdown";

type Lookup = { id: string; name: string };

/** Inline edit only touches amount and platformCharges. */
type InlineFeeForm = { amount: number; platformCharges: number; totalAmount: number };

const EMPTY_INLINE: InlineFeeForm = { amount: 0, platformCharges: 90, totalAmount: 90 };

const EMPTY_FILTERS = {
  degree: [] as string[],
  course: [] as string[],
  category: [] as string[],
  academicYear: [] as string[],
};

function formatCurrency(amount: number | undefined) {
  return `₹${(amount ?? 0).toLocaleString("en-IN")}`;
}

function withRecalculatedTotal(
  form: InlineFeeForm,
  patch: Partial<Pick<InlineFeeForm, "amount" | "platformCharges">>
): InlineFeeForm {
  const next = { ...form, ...patch };
  return { ...next, totalAmount: next.amount + next.platformCharges };
}

function feeToInline(fee: ApplicationFee): InlineFeeForm {
  return { amount: fee.amount, platformCharges: fee.platformCharges, totalAmount: fee.totalAmount };
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

function FeePills({ fee }: { fee: ApplicationFee }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100 rounded-full bg-blue-50">
        Fee {formatCurrency(fee.amount)}
      </span>
      <span className="px-2 py-0.5 text-xs font-semibold border rounded-full bg-violet-50 text-violet-700 border-violet-100">
        Platform {formatCurrency(fee.platformCharges)}
      </span>
      <span className="px-2 py-0.5 text-xs font-semibold border rounded-full bg-emerald-50 text-emerald-700 border-emerald-100">
        Payable {formatCurrency(fee.totalAmount)}
      </span>
    </div>
  );
}

type DegreeCourseRow = {
  degreeId: string;
  courseIds: string[];
};

const EMPTY_DEGREE_COURSE_ROW: DegreeCourseRow = { degreeId: "", courseIds: [] };

type AddForm = {
  selectedDegreeTypeId: string;
  /** Repeatable Degree + Course rows — use "+ Add Degree" to add another row. */
  degreeCourseRows: DegreeCourseRow[];
  selectedYearIds: string[];
  selectedCategoryIds: string[];
  selectedBatchTypeIds: string[];
  startDate: string;
  endDate: string;
  amount: number;
  platformCharges: number;
  totalAmount: number;
};

/** A degree+course+year+category combination that already has a saved fee. */
type DuplicateCombo = {
  degree: string;
  course: string;
  year: string;
  category: string;
  fee: ApplicationFee;
};

const EMPTY_ADD_FORM: AddForm = {
  selectedDegreeTypeId: "",
  degreeCourseRows: [{ ...EMPTY_DEGREE_COURSE_ROW }],
  selectedYearIds: [],
  selectedCategoryIds: [],
  selectedBatchTypeIds: [],
  startDate: "",
  endDate: "",
  amount: 0,
  platformCharges: 90,
  totalAmount: 90,
};

function validateAddForm(form: AddForm, requireBatch: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.selectedDegreeTypeId) e.degreeTypeId = "Select a degree type";
  const rowsWithDegree = form.degreeCourseRows.filter((r) => r.degreeId);
  if (rowsWithDegree.length === 0) e.degreeIds = "Select at least one degree";
  const missingCourses = rowsWithDegree.some((r) => r.courseIds.length === 0);
  if (rowsWithDegree.length > 0 && missingCourses) e.courseIds = "Select at least one course for every selected degree";
  if (form.selectedYearIds.length === 0) e.yearIds = "Select at least one academic year";
  if (form.selectedCategoryIds.length === 0) e.categoryIds = "Select at least one category";
  if (requireBatch && form.selectedBatchTypeIds.length === 0) e.BatchTypeIds = "Select at least one batch";
  if (!form.startDate) e.startDate = "Select a start date";
  if (!form.endDate) e.endDate = "Select an end date";
  if (form.startDate && form.endDate && form.endDate < form.startDate) e.endDate = "End date must be after start date";
  if (form.amount <= 0) e.amount = "Enter the application fee amount";
  if (form.platformCharges < 0) e.platformCharges = "Cannot be negative";
  return e;
}

const inlineInputClass =
  "mt-0.5 w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40";

// ─── Main component ───────────────────────────────────────────────────────────

export default function ApplicationFeeMaster() {
  // Master data
  const [fees, setFees] = useState<ApplicationFee[]>([]);
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [categories, setCategories] = useState<Lookup[]>([]);
  const [batches, setBatches] = useState<Lookup[]>([]);
  const [degreeTypeOptions, setDegreeTypeOptions] = useState<Lookup[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [activeDegreeTypeTab, setActiveDegreeTypeTab] = useState<string | null>(null);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD_FORM);
  const [addErrors, setAddErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);

  // Duplicate-fee popup (shown instead of an inline error when a combo is already saved)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateCombos, setDuplicateCombos] = useState<DuplicateCombo[]>([]);

  // Inline (amount-only) edit
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState<InlineFeeForm>(EMPTY_INLINE);
  const [inlineSaving, setInlineSaving] = useState(false);

  // Status toggle debounce
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load ──
  useEffect(() => {
    const load = async () => {
      try {
        const [degreeData, courseData, yearData, categoryData, batchData, degreeTypeData] = await Promise.all([
          getDegrees(),
          getCourses(),
          getAcademicYears(),
          getLookupsByType("Category", ""),
          getLookupsByType("Batch", ""),
          getLookupsByType("DegreeType", ""),
        ]);
        setDegrees(degreeData);
        setAllCourses(courseData);
        setAcademicYears(yearData);
        setCategories(categoryData.map((c) => ({ id: c.id, name: c.name ?? c.code ?? "—" })));
        setBatches(batchData.map((b) => ({ id: b.id, name: b.name ?? b.code ?? "—" })));
        setDegreeTypeOptions(degreeTypeData.map((t) => ({ id: t.id, name: t.name ?? t.code ?? "—" })));

        try { setFees(await getApplicationFees()); }
        catch (err) { console.error("getApplicationFees failed", err); }
      } catch (err) {
        console.error("Master data load failed", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Lookups ──
  const degreeName = useCallback((id: string) => degrees.find((d) => d.id === id)?.degreeName ?? "—", [degrees]);
  const courseName = useCallback((id: string) => allCourses.find((c) => c.id === id)?.name ?? "—", [allCourses]);
  const categoryName = useCallback((id: string) => categories.find((c) => c.id === id)?.name ?? "—", [categories]);
  const yearName = useCallback((id: string) => {
    const yr = academicYears.find((y) => y.id === id);
    if (!yr) return id || "—";
    return yr.description || `${yr.startDate ?? ""} – ${yr.endDate ?? ""}`;
  }, [academicYears]);
  const batchName = useCallback((id: string | undefined | null) => {
    if (!id) return "—";
    return batches.find((b) => b.id === id)?.name ?? "—";
  }, [batches]);
  const degreeTypeName = useCallback((id: string | undefined | null) => {
    if (!id) return "—";
    return degreeTypeOptions.find((t) => t.id === id)?.name ?? "—";
  }, [degreeTypeOptions]);

  const isCertificationDegree = useCallback(
    (degreeId: string) => {
      const degree = degrees.find((d) => d.id === degreeId);
      const degreeTypeId = (degree as unknown as { degreeTypeId?: string })?.degreeTypeId;
      return (
        degreeTypeOptions
          .find((t) => t.id === degreeTypeId)
          ?.name?.toLowerCase()
          .includes("certification") ?? false
      );
    },
    [degrees, degreeTypeOptions]
  );

  // Degrees available for the selected degree type in the add form
  const degreeOptionsForAdd = useMemo(() => {
    if (!addForm.selectedDegreeTypeId) return degrees;
    return degrees.filter(
      (d) => (d as unknown as { degreeTypeId?: string }).degreeTypeId === addForm.selectedDegreeTypeId
    );
  }, [degrees, addForm.selectedDegreeTypeId]);

  useEffect(() => {
    setAddForm((prev) => {
      const nextRows = prev.degreeCourseRows.map((row) =>
        row.degreeId && !degreeOptionsForAdd.some((d) => d.id === row.degreeId)
          ? { ...EMPTY_DEGREE_COURSE_ROW }
          : row
      );
      const changed = nextRows.some((row, i) => row !== prev.degreeCourseRows[i]);
      return changed ? { ...prev, degreeCourseRows: nextRows } : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addForm.selectedDegreeTypeId]);

  const courseOptionsForDegree = useCallback(
    (degreeId: string) => allCourses.filter((c) => c.degreeId === degreeId),
    [allCourses]
  );

  useEffect(() => {
    setAddForm((prev) => {
      let changed = false;
      const nextRows = prev.degreeCourseRows.map((row) => {
        if (!row.degreeId || row.courseIds.length > 0) return row;
        const opts = courseOptionsForDegree(row.degreeId);
        if (opts.length === 1) {
          changed = true;
          return { ...row, courseIds: [opts[0].id] };
        }
        return row;
      });
      return changed ? { ...prev, degreeCourseRows: nextRows } : prev;
    });
  }, [addForm.degreeCourseRows, courseOptionsForDegree]);

  const courseOptionsFor = useCallback(
    (degreeIds: string[]) => degreeIds.length > 0 ? allCourses.filter((c) => degreeIds.includes(c.degreeId)) : allCourses,
    [allCourses]
  );

  useEffect(() => {
    if (filters.degree.length === 0) return;
    setFilters((prev) => {
      const valid = courseOptionsFor(prev.degree);
      const validCourseIds = prev.course.filter((cid) => valid.some((c) => c.id === cid));
      if (validCourseIds.length === prev.course.length) return prev;
      return { ...prev, course: validCourseIds };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.degree]);

  // ── Filtering & pagination ──
  const filteredFees = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = fees.filter((f) => {
      const degreeMatch = filters.degree.length === 0 || filters.degree.includes(f.degreeId);
      const courseMatch = filters.course.length === 0 || filters.course.includes(f.courseId);
      const categoryMatch = filters.category.length === 0 || filters.category.includes(f.categoryId);
      const yearMatch = filters.academicYear.length === 0 || filters.academicYear.includes(f.academicYearId);
      const searchMatch =
        !q ||
        degreeName(f.degreeId).toLowerCase().includes(q) ||
        courseName(f.courseId).toLowerCase().includes(q) ||
        categoryName(f.categoryId).toLowerCase().includes(q) ||
        yearName(f.academicYearId).toLowerCase().includes(q);
      return degreeMatch && courseMatch && categoryMatch && yearMatch && searchMatch;
    });
    return [...matches].sort((a, b) => degreeName(a.degreeId).localeCompare(degreeName(b.degreeId)));
  }, [fees, filters, search, degreeName, courseName, categoryName, yearName]);

  useEffect(() => {
    setExpandedGroups(new Set());
  }, [filters, search]);

  // 3-level grouping: Degree Type → Degree → Course
  const groupedByDegreeType = useMemo(() => {
    // Level 1: by degreeTypeId
    const typeMap = new Map<string, ApplicationFee[]>();
    for (const fee of filteredFees) {
      const key = (fee as unknown as { degreeTypeId?: string }).degreeTypeId || "unassigned";
      if (!typeMap.has(key)) typeMap.set(key, []);
      typeMap.get(key)!.push(fee);
    }
    return Array.from(typeMap.entries()).map(([degreeTypeId, typeFees]) => {
      // Level 2: by degreeId within this type
      const degreeMap = new Map<string, ApplicationFee[]>();
      for (const fee of typeFees) {
        const key = fee.degreeId || "unassigned";
        if (!degreeMap.has(key)) degreeMap.set(key, []);
        degreeMap.get(key)!.push(fee);
      }
      const byDegree = Array.from(degreeMap.entries()).map(([degreeId, degreeFees]) => {
        // Level 3: by courseId within this degree
        const courseMap = new Map<string, ApplicationFee[]>();
        for (const fee of degreeFees) {
          const key = fee.courseId || "unassigned";
          if (!courseMap.has(key)) courseMap.set(key, []);
          courseMap.get(key)!.push(fee);
        }
        return { degreeId, byCourse: Array.from(courseMap.entries()) };
      });
      return { degreeTypeId, byDegree };
    });
  }, [filteredFees]);

  useEffect(() => {
    if (groupedByDegreeType.length === 0) return;
    const stillExists = groupedByDegreeType.some((g) => g.degreeTypeId === activeDegreeTypeTab);
    if (!stillExists) setActiveDegreeTypeTab(groupedByDegreeType[0].degreeTypeId);
  }, [groupedByDegreeType, activeDegreeTypeTab]);

  const activeFilterCount =
    filters.degree.length + filters.course.length + filters.category.length + filters.academicYear.length;

  const filterSections = useMemo(() => [
    { key: "degree", title: "Degree", options: degrees.map((d) => ({ label: d.degreeName, value: d.id })) },
    {
      key: "course",
      title: "Course",
      options: courseOptionsFor(filters.degree).map((c) => ({ label: c.name, value: c.id })),
    },
    { key: "category", title: "Category", options: categories.map((c) => ({ label: c.name, value: c.id })) },
    {
      key: "academicYear",
      title: "Academic Year",
      options: academicYears.map((y) => ({
        label: y.description ?? `${y.startDate ?? ""} - ${y.endDate ?? ""}`,
        value: y.id,
      })),
    },
  ], [degrees, categories, academicYears, filters.degree, courseOptionsFor]);

  // ── Add modal ──
  const openAdd = () => {
    setAddForm(EMPTY_ADD_FORM);
    setAddErrors({});
    setAddOpen(true);
  };

  const updateAddAmount = (patch: Partial<Pick<AddForm, "amount" | "platformCharges">>) => {
    setAddForm((prev) => {
      const next = { ...prev, ...patch };
      return { ...next, totalAmount: next.amount + next.platformCharges };
    });
  };

  const addDegreeRow = () => {
    setAddForm((prev) => ({ ...prev, degreeCourseRows: [...prev.degreeCourseRows, { ...EMPTY_DEGREE_COURSE_ROW }] }));
  };

  const removeDegreeRow = (idx: number) => {
    setAddForm((prev) => ({
      ...prev,
      degreeCourseRows: prev.degreeCourseRows.filter((_, i) => i !== idx),
    }));
  };

  const updateDegreeRowDegree = (idx: number, degreeId: string) => {
    setAddForm((prev) => ({
      ...prev,
      degreeCourseRows: prev.degreeCourseRows.map((row, i) =>
        i === idx ? { degreeId, courseIds: [] } : row
      ),
    }));
  };

  const updateDegreeRowCourses = (idx: number, courseIds: string[]) => {
    setAddForm((prev) => ({
      ...prev,
      degreeCourseRows: prev.degreeCourseRows.map((row, i) => (i === idx ? { ...row, courseIds } : row)),
    }));
  };

  const totalDegreeCourseSelections = addForm.degreeCourseRows.reduce(
    (sum, row) => sum + (row.degreeId ? row.courseIds.length : 0),
    0
  );

  const combinationCount =
    totalDegreeCourseSelections *
    addForm.selectedYearIds.length *
    addForm.selectedCategoryIds.length;

  // Certification-type degrees additionally require a Batch selection.
  const isCertificationSelected =
    degreeTypeOptions.find((t) => t.id === addForm.selectedDegreeTypeId)?.name?.toLowerCase().includes("certification") ?? false;

  useEffect(() => {
    if (!isCertificationSelected && addForm.selectedBatchTypeIds.length > 0) {
      setAddForm((prev) => ({ ...prev, selectedBatchTypeIds: [] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCertificationSelected]);

  // ── Duplicate-combo guard: degree + course + academic year + category must be unique ──
  const findDuplicateCombos = useCallback(
    (form: AddForm): DuplicateCombo[] => {
      const dup: DuplicateCombo[] = [];
      for (const row of form.degreeCourseRows) {
        if (!row.degreeId) continue;
        const dId = row.degreeId;
        for (const cId of row.courseIds) {
          for (const yId of form.selectedYearIds) {
            for (const catId of form.selectedCategoryIds) {
              const matchedFee = fees.find(
                (f) =>
                  f.degreeId === dId &&
                  f.courseId === cId &&
                  f.academicYearId === yId &&
                  f.categoryId === catId
              );
              if (matchedFee) {
                dup.push({
                  degree: degreeName(dId),
                  course: courseName(cId),
                  year: yearName(yId),
                  category: categoryName(catId),
                  fee: matchedFee,
                });
              }
            }
          }
        }
      }
      return dup;
    },
    [fees, degreeName, courseName, yearName, categoryName]
  );

  const handleAdd = async () => {
    const errors = validateAddForm(addForm, isCertificationSelected);
    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const duplicates = findDuplicateCombos(addForm);
    if (duplicates.length > 0) {
      setDuplicateCombos(duplicates);
      setDuplicateModalOpen(true);
      return;
    }

    setSaving(true);
    try {
      // One bulk call per Degree, each scoped to that Degree's own selected
      // Courses only — this avoids crossing every selected Course against
      // every selected Degree when courses belong to different degrees.
      const created: ApplicationFee[] = [];
      for (const row of addForm.degreeCourseRows) {
        if (!row.degreeId || row.courseIds.length === 0) continue;
        const payload: ApplicationFeeBulkPayload = {
          degreeTypeIds: addForm.selectedDegreeTypeId ? [addForm.selectedDegreeTypeId] : [],
          degreeIds: [row.degreeId],
          courseIds: row.courseIds,
          academicYearIds: addForm.selectedYearIds,
          categoryIds: addForm.selectedCategoryIds,
          batchTypeIds: isCertificationSelected ? addForm.selectedBatchTypeIds : [],
          startDate: addForm.startDate || undefined,
          endDate: addForm.endDate || undefined,
          amount: addForm.amount,
          platformCharges: addForm.platformCharges,
          totalAmount: addForm.totalAmount,
        };
        created.push(...(await bulkCreateApplicationFees(payload)));
      }

      if (created.length === 0) {
        setFees(await getApplicationFees());
      } else {
        setFees((prev) => [...prev, ...created]);
      }

      showToast("Application fee added successfully.", "success");
      setAddOpen(false);
    } catch {
      showToast("Couldn't add the fees.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Status toggle ──
  const handleStatusToggle = async (fee: ApplicationFee) => {
    if (togglingId === fee.id) return;
    setTogglingId(fee.id);
    const nextStatus = !fee.isActive;
    setFees((prev) => prev.map((f) => (f.id === fee.id ? { ...f, isActive: nextStatus } : f)));
    try {
      const updated = await setApplicationFeeStatus(fee, nextStatus);
      setFees((prev) => prev.map((f) => (f.id === fee.id ? { ...f, ...updated, isActive: nextStatus } : f)));
      showToast(nextStatus ? "Fee rule is now active" : "Fee rule has been disabled", "success");
    } catch {
      setFees((prev) => prev.map((f) => (f.id === fee.id ? { ...f, isActive: !nextStatus } : f)));
      showToast(nextStatus ? "Couldn't enable the fee" : "Couldn't disable the fee", "error");
    } finally {
      setTogglingId(null);
    }
  };

  // ── Inline edit (amount + platform charges only) ──
  const openInlineEdit = (fee: ApplicationFee) => {
    setInlineEditId(fee.id);
    setInlineForm(feeToInline(fee));
  };

  // Used by the duplicate-fee popup: expand the Degree/Course groups that
  // fee belongs to, and start its inline edit.
  const editFeeInTable = (fee: ApplicationFee) => {
    setDuplicateModalOpen(false);
    setAddOpen(false);
    const typeId = (fee as unknown as { degreeTypeId?: string }).degreeTypeId || "unassigned";
    setActiveDegreeTypeTab(typeId);
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.add(`dg:${typeId}::${fee.degreeId}`);
      next.add(`cs:${typeId}::${fee.degreeId}::${fee.courseId}`);
      return next;
    });
    openInlineEdit(fee);
  };

  const handleInlineSave = async (fee: ApplicationFee) => {
    setInlineSaving(true);
    try {
      const currentStatus = fee.isActive;
      const payload: ApplicationFeePayload = {
        degreeId: fee.degreeId,
        courseId: fee.courseId,
        academicYearId: fee.academicYearId,
        categoryId: fee.categoryId,
        startDate: fee.startDate,
        endDate: fee.endDate,
        amount: inlineForm.amount,
        platformCharges: inlineForm.platformCharges,
        totalAmount: inlineForm.totalAmount,
      };
      const updated = await updateApplicationFee(fee.id, payload, currentStatus);
      setFees((prev) =>
        prev.map((f) => (f.id === fee.id ? { ...f, ...payload, ...updated } : f))
      );
      setInlineEditId(null);
      showToast("Application fee updated.", "success");
    } catch {
      showToast("Couldn't update the fee.", "error");
    } finally {
      setInlineSaving(false);
    }
  };

  // ── Reusable cell renderers (used inside the grouped Degree → Course table) ──
  const renderFeeDetailsCell = (f: ApplicationFee) =>
    inlineEditId === f.id ? (
      <div className="flex flex-col gap-2 py-1 min-w-[220px]">
        <label className="text-xs font-semibold text-slate-600">
          Application Fee (₹)
          <input
            type="number"
            min="0"
            className={inlineInputClass}
            value={inlineForm.amount === 0 ? "" : inlineForm.amount}
            placeholder="0"
            onChange={(e) =>
              setInlineForm((prev) =>
                withRecalculatedTotal(prev, { amount: e.target.value === "" ? 0 : Number(e.target.value) })
              )
            }
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Platform Charges (₹)
          <input
            type="number"
            min="0"
            className={inlineInputClass}
            value={inlineForm.platformCharges === 0 ? "" : inlineForm.platformCharges}
            placeholder="0"
            onChange={(e) =>
              setInlineForm((prev) =>
                withRecalculatedTotal(prev, { platformCharges: e.target.value === "" ? 0 : Number(e.target.value) })
              )
            }
          />
        </label>
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-xs font-semibold text-slate-600">Total</span>
          <span className="text-xs font-bold text-slate-800">{formatCurrency(inlineForm.totalAmount)}</span>
        </div>
      </div>
    ) : (
      <FeePills fee={f} />
    );

  const renderActionsCell = (f: ApplicationFee) =>
    inlineEditId === f.id ? (
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleInlineSave(f)}
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
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary text-primary hover:border-primary/40 hover:bg-primary/5 transition"
        >
          Edit Fee
        </button>
        <button
          type="button"
          onClick={() => handleStatusToggle(f)}
          disabled={togglingId === f.id}
          className={
            f.isActive
              ? "px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 transition disabled:opacity-50"
              : "px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition disabled:opacity-50"
          }
        >
          {f.isActive ? "Deactivate" : "Activate"}
        </button>
      </div>
    );

  // ── Loading ──
  if (loading) {
    return (
      <AppLayout pageTitle="Manage Application Fees">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader />
        </div>
      </AppLayout>
    );
  }

  const activeCount = fees.filter((f) => f.isActive).length;
  const inactiveCount = fees.length - activeCount;
  const distinctCourses = new Set(fees.map((f) => f.courseId)).size;

  return (
    <AppLayout pageTitle="Application Fee Master">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      <div className="px-4 py-6 mx-auto space-y-6 max-w-7xl sm:px-6 sm:py-8 lg:px-8" data-testid="application-fee-master">

        {/* ── Page header ── */}
        <div className="relative overflow-hidden border rounded-2xl sm:rounded-3xl border-primary bg-primary/5">

          <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:p-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3.5 sm:gap-4">
              <div className="flex items-center justify-center text-white w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-primary/70">
                <Wallet size={22} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight sm:text-xl text-slate-900">Application Fee Master</h1>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500 max-w-md">
                  Configure application fees for every Degree, Course, Academic Year and Category combination.
                </p>

                {/* Compact inline stats — replaces the previous stat card grid */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs sm:text-sm">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-emerald-400" />
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                    </span>
                    {activeCount} Active
                  </span>
                  <span className="hidden w-1 h-1 rounded-full bg-slate-300 sm:inline-block" />
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    {inactiveCount} Inactive
                  </span>
                  <span className="hidden w-1 h-1 rounded-full bg-slate-300 sm:inline-block" />
                  <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700">
                    <BookOpen size={13} className="text-blue-500" />
                    {distinctCourses} Courses Covered
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={openAdd}
              testId="btn-new-application-fee"
              className="inline-flex items-center justify-center w-full gap-2 sm:w-auto whitespace-nowrap"
            >
              <Plus size={18} className="shrink-0" />
              Add Application Fee
            </Button>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <Card className="rounded-2xl border-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 min-w-0 sm:max-w-sm">
              <Search size={15} className="absolute -translate-y-1/2 pointer-events-none left-3 top-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by degree, course or category…"
                className="w-full py-2.5 pr-8 text-sm transition border rounded-xl pl-9 border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
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

            <div className="flex items-center gap-2 shrink-0">
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
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-3 mt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400">Filtered by:</span>
              {(["degree", "course", "category", "academicYear"] as const).map((key) =>
                filters[key].map((val) => {
                  const section = filterSections.find((s) => s.key === key);
                  const opt = section?.options.find((o) => o.value === val);
                  if (!opt) return null;
                  return (
                    <span
                      key={`${key}-${val}`}
                      className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-[11px] font-semibold rounded-lg bg-primary/10 text-primary"
                    >
                      {opt.label}
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, [key]: prev[key].filter((v) => v !== val) }))
                        }
                        className="flex items-center justify-center w-3.5 h-3.5 transition rounded-full hover:bg-primary/20"
                      >
                        <X size={10} />
                      </span>
                    </span>
                  );
                })
              )}
            </div>
          )}
        </Card>

        {/* ── Empty state ── */}
        {filteredFees.length === 0 && (
          <Card className="overflow-hidden border rounded-2xl border-slate-200 bg-gradient-to-br from-primary/5 via-white to-indigo-50/60">
            <EmptyState
              title="No application fees added yet"
              description="Add a fee rule for each degree, course, category and academic year combination so students see the correct amount at payment time."
              actionLabel="New Application Fee"
              onAction={openAdd}
            />
          </Card>
        )}

        {/* ── Degree Type tabs, then Degree → Course accordion (3-level) ── */}
        {filteredFees.length > 0 && (
          <Card className="p-0 overflow-hidden border shadow-sm rounded-2xl border-slate-200">
            {/* ── Degree Type tabs ── */}
            <div className="flex gap-1 px-2 overflow-x-auto overflow-y-hidden border-b bg-slate-50/60">
              {groupedByDegreeType.map(({ degreeTypeId, byDegree }) => {
                const typeFees = byDegree.flatMap(({ byCourse }) => byCourse.flatMap(([, fs]) => fs));
                const active = activeDegreeTypeTab === degreeTypeId;
                return (
                  <button
                    key={degreeTypeId}
                    type="button"
                    onClick={() => setActiveDegreeTypeTab(degreeTypeId)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition ${active
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                      }`}
                  >
                    {degreeTypeName(degreeTypeId)}
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md shrink-0 ${active ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
                        }`}
                    >
                      {typeFees.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── Degree → Course accordion for the selected tab ── */}
            {(() => {
              const activeGroup = groupedByDegreeType.find((g) => g.degreeTypeId === activeDegreeTypeTab);
              if (!activeGroup) return null; // settles on the next render via the tab-settling effect
              const { degreeTypeId, byDegree } = activeGroup;
              return (
                <div className="p-4 space-y-2 bg-slate-50/60">
                  {byDegree.map(({ degreeId, byCourse }) => {
                    const dgKey = `dg:${degreeTypeId}::${degreeId}`;
                    const dgOpen = expandedGroups.has(dgKey);
                    const degreeFees = byCourse.flatMap(([, fs]) => fs);
                    return (
                      <div
                        key={dgKey}
                        className={`overflow-hidden bg-white border rounded-xl transition-shadow ${dgOpen ? "border-primary/30 shadow-sm" : "border-slate-200"}`}
                      >
                        {/* Degree header */}
                        <div
                          className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-slate-50"
                          onClick={() => toggleGroup(dgKey)}
                        >
                          <span className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition ${dgOpen ? "bg-primary/15 text-primary" : "text-slate-400"}`}>
                            {dgOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </span>
                          <span className="text-sm font-semibold truncate text-slate-700">{degreeName(degreeId)}</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 shrink-0">
                            {byCourse.length} course{byCourse.length === 1 ? "" : "s"}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 shrink-0">
                            {degreeFees.length}
                          </span>
                        </div>

                        {/* ── Courses within this Degree only ── */}
                        {dgOpen && (
                          <div className="px-3 pb-3 space-y-2 border-t border-slate-100 pt-2.5 bg-slate-50/40">
                            {byCourse.map(([courseId, courseFees]) => {
                              const csKey = `cs:${degreeTypeId}::${degreeId}::${courseId}`;
                              const csOpen = expandedGroups.has(csKey);
                              return (
                                <div
                                  key={csKey}
                                  className={`overflow-hidden bg-white border rounded-xl transition-shadow ${csOpen ? "border-indigo-200 shadow-sm" : "border-slate-200"}`}
                                >
                                  <div
                                    className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50"
                                    onClick={() => toggleGroup(csKey)}
                                  >
                                    <span className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition ${csOpen ? "bg-indigo-100 text-indigo-600" : "text-slate-400"}`}>
                                      {csOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    </span>
                                    <span className="flex items-center justify-center w-6 h-6 text-indigo-500 rounded-lg shrink-0 bg-indigo-50">
                                      <BookOpen size={12} />
                                    </span>
                                    <span className="text-sm font-semibold truncate text-slate-700">{courseName(courseId)}</span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 shrink-0">
                                      {courseFees.length}
                                    </span>
                                  </div>

                                  {/* Innermost: fee rows */}
                                  {csOpen && (
                                    <div className="overflow-x-auto border-t border-slate-100">
                                      <table className="w-full">
                                        <thead className="text-white bg-gradient-to-r from-primary to-primary/80">
                                          <tr>
                                            <th className="px-3 py-2.5 text-xs font-semibold text-center min-w-[80px]">Academic Year</th>
                                            <th className="px-3 py-2.5 text-xs font-semibold text-center min-w-[80px]">Category</th>
                                            {isCertificationDegree(degreeId) && (
                                              <th className="px-3 py-2.5 text-xs font-semibold text-center min-w-[80px]">Batch</th>
                                            )}
                                            <th className="px-3 py-2.5 text-xs font-semibold text-center min-w-[80px]">Start Date</th>
                                            <th className="px-3 py-2.5 text-xs font-semibold text-center min-w-[80px]">End Date</th>
                                            <th className="px-3 py-2.5 text-xs font-semibold text-center min-w-[80px]">Fee Details</th>
                                            <th className="px-3 py-2.5 text-xs font-semibold text-center min-w-[80px]">Status</th>
                                            <th className="px-3 py-2.5 text-xs font-semibold text-center min-w-[80px]">Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {courseFees.map((fee) => (
                                            <tr key={fee.id} className="transition border-t border-slate-100 hover:bg-primary/[0.03]">
                                              <td className="px-3 py-2.5 text-xs text-center font-medium text-slate-600 whitespace-nowrap">
                                                {yearName(fee.academicYearId)}
                                              </td>
                                              <td className="px-3 py-2.5">
                                                <span className="inline-flex items-center text-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                  <Tag size={11} /> {categoryName(fee.categoryId)}
                                                </span>
                                              </td>
                                              {isCertificationDegree(degreeId) && (
                                                <td className="px-3 py-2.5 text-xs font-medium text-center text-slate-600 whitespace-nowrap">
                                                  {batchName(
                                                    (fee as unknown as { batchId?: string; batchTypeId?: string }).batchId ??
                                                    (fee as unknown as { batchId?: string; batchTypeId?: string }).batchTypeId
                                                  )}
                                                </td>
                                              )}
                                              <td className="px-3 py-2.5 text-xs font-medium text-center text-slate-600 whitespace-nowrap">
                                                {fee.startDate ?? "—"}
                                              </td>
                                              <td className="px-3 py-2.5 text-xs font-medium text-center text-slate-600 whitespace-nowrap">
                                                {fee.endDate ?? "—"}
                                              </td>
                                              <td className="px-3 py-2.5 text-center">{renderFeeDetailsCell(fee)}</td>
                                              <td className="px-3 py-2.5 text-center"><StatusBadge active={fee.isActive} /></td>
                                              <td className="px-3 py-2.5 text-center">{renderActionsCell(fee)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>
        )}
      </div>

      {/* ── Add Modal ── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Application Fee"
        size="xl"
        testId="application-fee-modal"
      >
        <div className="space-y-6">

          {/* Multi-select guidance */}
          <div className="flex items-start gap-2.5 px-4 py-3 border rounded-xl border-blue-100 bg-blue-50/60">
            <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed text-blue-800">
              Select <span className="font-semibold">multiple Degrees, Courses, Academic Years and Categories</span> at
              once — a fee record is created for every combination.
              {combinationCount > 0 && (
                <span className="block mt-1 font-semibold">
                  This will create {combinationCount} fee record{combinationCount === 1 ? "" : "s"}.
                </span>
              )}
            </p>
          </div>

          {/* Degree Type (single-select) + Degree/Course multi-select */}
          <div>
            <p className="mb-3 text-xs font-bold tracking-widest text-gray-600 uppercase">Programme</p>
            <div className="mb-4">
              <label className="block mb-1.5 text-sm font-semibold text-gray-800">
                Degree Type <span className="text-red-500">*</span>
              </label>
              <select
                value={addForm.selectedDegreeTypeId}
                onChange={(e) =>
                  setAddForm((prev) => ({
                    ...prev,
                    selectedDegreeTypeId: e.target.value,
                    degreeCourseRows: [{ ...EMPTY_DEGREE_COURSE_ROW }],
                  }))
                }
                className={`w-full px-3 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 ${addErrors.degreeTypeId ? "border-red-300" : "border-slate-300"}`}
              >
                <option value="">Select a degree type</option>
                {degreeTypeOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {addErrors.degreeTypeId && <p className="mt-1 text-xs font-medium text-red-500">{addErrors.degreeTypeId}</p>}
            </div>

            <div className="space-y-3">
              {addForm.degreeCourseRows.map((row, idx) => {
                // A Degree already chosen in another row can't be picked again here.
                const otherDegreeIds = addForm.degreeCourseRows
                  .filter((_, i) => i !== idx)
                  .map((r) => r.degreeId)
                  .filter(Boolean);
                const degreeOptionsForRow = degreeOptionsForAdd.filter(
                  (d) => d.id === row.degreeId || !otherDegreeIds.includes(d.id)
                );
                const degreeCourseOptions = row.degreeId ? courseOptionsForDegree(row.degreeId) : [];

                return (
                  <div key={idx} className="relative p-3 border rounded-xl border-slate-200 bg-slate-50/60">
                    {addForm.degreeCourseRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDegreeRow(idx)}
                        title="Remove this degree"
                        className="absolute flex items-center justify-center w-6 h-6 text-gray-400 rounded-full top-2 right-2 hover:bg-red-50 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <p className="mb-2 text-xs font-semibold tracking-wide uppercase text-slate-500">
                      {addForm.degreeCourseRows.length > 1 ? `Degree ${idx + 1}` : "Degree"}
                    </p>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block mb-1.5 text-sm font-semibold text-gray-800">
                          Degree <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={row.degreeId}
                          onChange={(e) => updateDegreeRowDegree(idx, e.target.value)}
                          className="w-full px-3 py-2.5 text-sm bg-white border rounded-xl border-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                        >
                          <option value="">Select a degree</option>
                          {degreeOptionsForRow.map((d) => (
                            <option key={d.id} value={d.id}>{d.degreeName}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <AddFormMultiSelect
                          label="Course"
                          required
                          options={degreeCourseOptions.map((c) => ({ id: c.id, name: c.name }))}
                          selectedIds={row.courseIds}
                          onChange={(ids) => updateDegreeRowCourses(idx, ids)}
                          helperText={
                            row.degreeId
                              ? `${degreeCourseOptions.length} course${degreeCourseOptions.length === 1 ? "" : "s"} available for ${degreeName(row.degreeId)}`
                              : "Select a degree first"
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {addErrors.degreeIds && <p className="text-xs font-medium text-red-500">{addErrors.degreeIds}</p>}
              {addErrors.courseIds && <p className="text-xs font-medium text-red-500">{addErrors.courseIds}</p>}
            </div>

            <Button type="button" onClick={addDegreeRow} variant="outline" className="gap-1.5 mt-3">
              <Plus size={14} /> Add Degree
            </Button>
          </div>

          {/* Academic year + Category multi-select */}
          <div>
            <p className="mb-3 text-xs font-bold tracking-widest text-gray-600 uppercase">Classification</p>
            <div className="grid grid-cols-2 gap-4">
              <AddFormMultiSelect
                label="Academic Year"
                required
                options={academicYears.map((y) => ({
                  id: y.id,
                  name: y.description || `${y.startDate ?? ""} – ${y.endDate ?? ""}`,
                }))}
                selectedIds={addForm.selectedYearIds}
                onChange={(ids) => setAddForm((prev) => ({ ...prev, selectedYearIds: ids }))}
                error={addErrors.yearIds}
              />
              <AddFormMultiSelect
                label="Category"
                required
                options={categories}
                selectedIds={addForm.selectedCategoryIds}
                onChange={(ids) => setAddForm((prev) => ({ ...prev, selectedCategoryIds: ids }))}
                error={addErrors.categoryIds}
              />
            </div>
          </div>

          {/* Batch multi-select — only for Certification-type degrees */}
          {isCertificationSelected && (
            <div>
              <p className="mb-3 text-xs font-bold tracking-widest text-gray-600 uppercase">Batch</p>
              <AddFormMultiSelect
                label="Batch"
                required
                options={batches}
                selectedIds={addForm.selectedBatchTypeIds}
                onChange={(ids) => setAddForm((prev) => ({ ...prev, selectedBatchTypeIds: ids }))}
                error={addErrors.BatchTypeIds}
              />
            </div>
          )}

          {/* Validity Period */}
          <div>
            <p className="mb-3 text-xs font-bold tracking-widest text-gray-600 uppercase">Validity Period</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-800">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={addForm.startDate}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className={`w-full px-3 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 ${addErrors.startDate ? "border-red-300" : "border-slate-300"}`}
                />
                {addErrors.startDate && <p className="mt-1 text-xs font-medium text-red-500">{addErrors.startDate}</p>}
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-800">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={addForm.endDate}
                  min={addForm.startDate || undefined}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  className={`w-full px-3 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 ${addErrors.endDate ? "border-red-300" : "border-slate-300"}`}
                />
                {addErrors.endDate && <p className="mt-1 text-xs font-medium text-red-500">{addErrors.endDate}</p>}
              </div>
            </div>
          </div>

          {/* Amounts */}
          <div>
            <p className="mb-3 text-xs font-bold tracking-widest text-gray-600 uppercase">Amounts</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Application Fee Amount (₹)"
                type="number"
                required
                min="0"
                value={String(addForm.amount)}
                error={addErrors.amount}
                onChange={(e) => updateAddAmount({ amount: Number(e.target.value) || 0 })}
              />
              <Input
                label="Platform Charges (₹)"
                type="number"
                min="0"
                value={String(addForm.platformCharges)}
                error={addErrors.platformCharges}
                onChange={(e) => updateAddAmount({ platformCharges: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Total payable summary */}
          <div className="flex items-center gap-3 px-4 py-3 border rounded-xl border-emerald-100 bg-emerald-50/60">
            <Wallet size={16} className="text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex items-center justify-between flex-1">
              <span className="text-sm font-semibold text-emerald-900">Total Payable</span>
              <span className="text-lg font-bold text-emerald-700">{formatCurrency(addForm.totalAmount)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdd} disabled={saving}>
              {saving ? "Saving…" : "Add fee"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Duplicate fee popup: shown instead of saving when a combo already exists ── */}
      <Modal
        open={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        title="Already Saved"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 px-4 py-3 border rounded-xl border-amber-200 bg-amber-50">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed text-amber-800">
              An application fee is already saved for the combination(s) below, so nothing new was added. You can
              edit the existing fee to make changes instead.
            </p>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-80">
            {duplicateCombos.map((d, i) => (
              <div key={`${d.fee.id}-${i}`} className="p-3 border rounded-xl border-slate-200 bg-slate-50/60">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div>
                    <span className="font-semibold text-slate-500">Degree</span>
                    <p className="font-semibold text-slate-700">{d.degree}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Course</span>
                    <p className="font-semibold text-slate-700">{d.course}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Academic Year</span>
                    <p className="font-semibold text-slate-700">{d.year}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Category</span>
                    <p className="font-semibold text-slate-700">{d.category}</p>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => editFeeInTable(d.fee)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary text-primary hover:bg-primary hover:text-white transition"
                  >
                    Edit this fee
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-1 border-t border-gray-100">
            <Button variant="outline" onClick={() => setDuplicateModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

    </AppLayout>
  );
}