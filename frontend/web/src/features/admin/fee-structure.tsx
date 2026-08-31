/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Save, Pencil, Receipt, IndianRupee, ChevronDown, ChevronRight } from "lucide-react";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import SearchableSelect from "../../components/ui/SearchableSelect";
import MultiSelectDropdown from "../../components/ui/MultiselectDropdown";
import FilterPanel from "../../components/ui/FilterPanel";
import Pagination from "../../components/ui/Pagination";
import Toast from "../../components/ui/Toast";
import DateField from "../../components/ui/DateField";
import { getDegrees, type Degree } from "../../services/degreeService";
import { getCourses, type Course } from "../../services/courseService";
import { getLookupsByType, type LookupResponse } from "../../services/lookupService";
import { getAcademicYears, type AcademicYear } from "../../services/academicYearService";
import {
  createAdmissionFeeStructure,
  getAdmissionFeeStructures,
  updateAdmissionFeeStructure,
  deleteAdmissionFeeStructure,
  type AdmissionFeeStructure,
} from "../../services/admissionFeeStructureService";

/* ---------------- TYPES ---------------- */

type FeeItem = {
  id: string;
  particularName: string;
  amount: number;
  installment1: boolean;
  installment2: boolean;
  installment1Amount: number;
  installment2Amount: number;
};

// These 3 fee types get split-amount inputs instead of boolean checkboxes
const isSplitItem = (name: string): boolean => {
  const n = name.toLowerCase();
  return (
    n.includes("tuition") ||
    n.includes("laboratory") ||
    n.includes("skill development") ||
    n.includes("rural immersion") ||
    n.includes("field work") ||
    n.includes("visits fee")
  );
};

type FormState = {
  id?: string;           // present when editing an existing record
  degreeTypeId: string;  // UG / PG lookup id — determines which fee names are selectable
  feeId: string;          // selected Fee Name lookup id (type=FeeStructure)
  feeName: string;        // display name of the selected Fee Name lookup entry
  degreeId: string;
  courseId: string;
  categoryIds: string[]; // multi-select on create; single-item array on edit
  academicYearId: string;
  annualIncomeId: string;
  feeItems: FeeItem[];
  deductionYn: boolean;
  deductionPercentage: number;
  // late-fine window
  fineAmount: number;
  startDate: string;
  endDate: string;
  fineEndDate: string;
};

const EMPTY_FORM: FormState = {
  degreeTypeId: "",
  feeId: "",
  feeName: "",
  degreeId: "",
  courseId: "",
  categoryIds: [],
  academicYearId: "",
  annualIncomeId: "",
  feeItems: [],
  deductionYn: false,
  deductionPercentage: 0,
  fineAmount: 0,
  startDate: "",
  endDate: "",
  fineEndDate: "",
};

/**
 * Whether the late fine has actually kicked in *today*.
 * The fine only applies once the no-fine window (endDate) has passed —
 * it's added to the total starting the day after endDate, not before.
 */
function isFineActive(endDate: string | null | undefined): boolean {
  if (!endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  if (Number.isNaN(end.getTime())) return false;
  // >= so setting the deadline to today activates the fine immediately,
  // not just from tomorrow.
  return today.getTime() >= end.getTime();
}

/**
 * Live/derived payAmount for a saved record — recalculated from the stored
 * totalAmount/deductionAmount/fineAmount using *today's* date, rather than
 * trusting the payAmount that was last persisted.
 *
 * payAmount is only written back to the DB when the edit modal is saved, so
 * the stored value goes stale the moment a record's fine endDate passes
 * without anyone re-opening and saving it. Recomputing it here means the
 * list (and anywhere else that reads it) always reflects the current fine
 * status instead of a stale snapshot.
 */
function getEffectivePayAmount(fs: AdmissionFeeStructure): number {
  const total = fs.totalAmount ?? 0;
  const deduction = fs.deductionYn ? (fs.deductionAmount ?? 0) : 0;
  const fine = isFineActive(fs.endDate) ? (fs.fineAmount ?? 0) : 0;
  return total - deduction + fine;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/* ---------------- COMPONENT ---------------- */

export default function FeeStructureTab() {
  /* ── reference data ── */
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [academicYearOptions, setAcademicYearOptions] = useState<AcademicYear[]>([]);
  const [incomeOptions, setIncomeOptions] = useState<{ label: string; value: string }[]>([]);
  const [degreeTypeOptions, setDegreeTypeOptions] = useState<LookupResponse[]>([]);
  const [feeNameOptions, setFeeNameOptions] = useState<LookupResponse[]>([]);
  const [feeNameLoading, setFeeNameLoading] = useState(false);

  /* ── list ── */
  const [feeStructures, setFeeStructures] = useState<AdmissionFeeStructure[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listFilters, setListFilters] = useState<Record<string, string[]>>({
    degree: [], course: [], category: [],
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  /* ── toast ── */
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ── modal (add / edit) form ── */
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [newParticularName, setNewParticularName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [installmentEnabled, setInstallmentEnabled] = useState(false);

  /* ── expanded fee name groups ── */
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (feeName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(feeName)) next.delete(feeName);
      else next.add(feeName);
      return next;
    });
  };

  /* ── expanded category lists within a programme row ──
   * A programme (degree+course) can have up to ~10 category records. We only
   * render CATEGORY_PREVIEW_COUNT rows by default and let the user expand the
   * rest, so a fee-name group with several programmes doesn't force a long
   * page scroll just to see one more programme. ── */
  const CATEGORY_PREVIEW_COUNT = 3;
  const [expandedProgrammes, setExpandedProgrammes] = useState<Set<string>>(new Set());
  const toggleProgramme = (key: string) => {
    setExpandedProgrammes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* ── load reference data ── */
  useEffect(() => {
    getDegrees().then(setDegrees).catch(console.error);
    getCourses().then(setCourses).catch(console.error);
    getLookupsByType("Category")
      .then((data) => setCategoryOptions(data.map((d) => ({ label: d.name ?? "", value: d.id }))))
      .catch(console.error);
    getLookupsByType("Income")
      .then((data) => setIncomeOptions(data.map((d) => ({ label: d.name ?? "", value: d.id }))))
      .catch(console.error);
    getAcademicYears().then(setAcademicYearOptions).catch(console.error);
    // Degree Type (UG / PG / Diploma) — same lookup + code filter used on the registration page
    getLookupsByType("DegreeType")
      .then((options) => {
        setDegreeTypeOptions(
          options.filter((option) => ["001", "005", "002"].includes(option.code ?? ""))
        );
      })
      .catch(console.error);
  }, []);

  /* ── load fee names for the selected degree type ── */
  useEffect(() => {
    const degreeType = degreeTypeOptions.find((o) => o.id === formData.degreeTypeId);
    // Match on type2 (UG / PG), not the display name — FeeStructure lookup
    // rows carry type2 = "UG" / "PG" to indicate which degree type they belong to.
    if (!degreeType?.type2) {
      setFeeNameOptions([]);
      return;
    }
    setFeeNameLoading(true);
    getLookupsByType("FeeStructure", degreeType.type2)
      .then(setFeeNameOptions)
      .catch(console.error)
      .finally(() => setFeeNameLoading(false));
  }, [formData.degreeTypeId, degreeTypeOptions]);

  /* ── load list ── */
  const loadList = () => {
    setListLoading(true);
    getAdmissionFeeStructures()
      .then(setFeeStructures)
      .catch(console.error)
      .finally(() => setListLoading(false));
  };

  useEffect(() => { loadList(); }, []);

  /* ── helpers: look up labels ── */
  const degreeName = (id?: string) => degrees.find((d) => d.id === id)?.degreeName ?? id ?? "—";
  const courseName = (id?: string) => courses.find((c) => c.id === id)?.name ?? id ?? "—";
  const categoryName = (id?: string) => categoryOptions.find((c) => c.value === id)?.label ?? id ?? "—";
  const academicYearLabel = (id?: string) => {
    const yr = academicYearOptions.find((y) => y.id === id);
    if (!yr) return id ?? "—";
    return yr.description || `${yr.startDate ?? ""} – ${yr.endDate ?? ""}`;
  };

  /* ── group rows within a fee-name group by Degree + Course, so every
   *    category for that programme is combined into a single row instead
   *    of one row per category. ── */
  const groupRowsByProgramme = (rows: AdmissionFeeStructure[]) => {
    const map = new Map<string, AdmissionFeeStructure[]>();
    const order: string[] = [];
    for (const r of rows) {
      const key = `${r.degreeId ?? ""}|${r.courseId ?? ""}`;
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(r);
    }
    return order.map((key) => ({ key, records: map.get(key)! }));
  };

  /* ── filtered list ── */
  const filteredFeeStructures = useMemo(() => {
    return feeStructures.filter((fs) => {
      const degreeMatch = listFilters.degree.length === 0 || listFilters.degree.includes(fs.degreeId ?? "");
      const courseMatch = listFilters.course.length === 0 || listFilters.course.includes(fs.courseId ?? "");
      const categoryMatch = listFilters.category.length === 0 || listFilters.category.includes(fs.categoryId ?? "");
      return degreeMatch && courseMatch && categoryMatch;
    });
  }, [feeStructures, listFilters]);

  /* ── grouping + pagination ── */

  // Group ALL filtered records by feeName first, then paginate the groups
  const allGroupedByFeeName = useMemo(() => {
    const groups: { feeName: string; rows: AdmissionFeeStructure[] }[] = [];
    const seen = new Map<string, AdmissionFeeStructure[]>();
    for (const fs of filteredFeeStructures) {
      const key = fs.feeName?.trim() || "—";
      if (!seen.has(key)) {
        seen.set(key, []);
        groups.push({ feeName: key, rows: seen.get(key)! });
      }
      seen.get(key)!.push(fs);
    }
    return groups;
  }, [filteredFeeStructures]);

  const totalPages = Math.max(1, Math.ceil(allGroupedByFeeName.length / PAGE_SIZE));

  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return allGroupedByFeeName.slice(start, start + PAGE_SIZE);
  }, [allGroupedByFeeName, page]);

  useEffect(() => {
    setPage(1);
    setExpandedGroups(new Set());
    setExpandedProgrammes(new Set());
  }, [listFilters]);

  useEffect(() => {
    setPage(1);
  }, [feeStructures]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  /* ── totals ── */
  const totalFees = formData.feeItems.reduce((s, i) => s + (i.amount || 0), 0);
  const deductionAmount = formData.deductionYn ? (totalFees * formData.deductionPercentage) / 100 : 0;
  const fineActive = isFineActive(formData.endDate);
  // Whether the selected Degree Type is PG — used to decide whether the PG
  // in-service conditional-charge note applies (Non-Karnataka applies regardless).
  const isSelectedDegreeTypePg =
    degreeTypeOptions.find((o) => o.id === formData.degreeTypeId)?.type2 === "PG";
  // fineAmount is always saved as-entered; it auto-applies at payment time once endDate passes
  const effectiveFineAmount = fineActive ? formData.fineAmount : 0;
  // payAmount = what the student actually pays today (deduction + fine if active)
  const payAmount = totalFees - deductionAmount + effectiveFineAmount;

  /* ── open modal for create ── */
  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setInstallmentEnabled(false);
    setNewParticularName("");
    setNewAmount("");
    setModalOpen(true);
  };

  /* ── open modal for edit ── */
  const openEdit = (fs: AdmissionFeeStructure) => {
    setFormData({
      id: fs.id,
      degreeTypeId: fs.degreeTypeId ?? "",
      feeId: fs.feeId ?? "",
      feeName: fs.feeName ?? "",
      degreeId: fs.degreeId ?? "",
      courseId: fs.courseId ?? "",
      categoryIds: fs.categoryId ? [fs.categoryId] : [],
      academicYearId: fs.academicYearId ?? "",
      annualIncomeId: fs.annualIncomeId ?? "",
      deductionYn: fs.deductionYn ?? false,
      // Recompute the percentage from what was actually saved (deductionAmount / totalAmount).
      // This used to be hardcoded to 0, which silently wiped out any existing discount
      // the moment the record was opened for edit — see note below.
      deductionPercentage:
        fs.deductionYn && fs.totalAmount
          ? Math.round(((fs.deductionAmount ?? 0) / fs.totalAmount) * 10000) / 100
          : 0,
      fineAmount: fs.fineAmount ?? 0,
      startDate: fs.startDate ? fs.startDate.slice(0, 10) : "",
      endDate: fs.endDate ? fs.endDate.slice(0, 10) : "",
      fineEndDate: fs.fineEndDate ? fs.fineEndDate.slice(0, 10) : "",
      feeItems: (fs.details ?? []).map((d) => ({
        id: d.id ?? Date.now().toString(),
        particularName: d.particularName ?? "",
        amount: d.amount ?? 0,
        installment1: d.installment1 ?? false,
        installment2: d.installment2 ?? false,
        installment1Amount: d.installment1Amount ?? 0,
        installment2Amount: d.installment2Amount ?? 0,
      })),
    });
    setInstallmentEnabled((fs.details ?? []).some((d) => d.installment1 || d.installment2));
    setNewParticularName("");
    setNewAmount("");
    setModalOpen(true);
  };

  /* ── delete ── */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this fee structure?")) return;
    try {
      await deleteAdmissionFeeStructure(id);
      loadList();
      showToast("Fee structure deleted.", "success");
    } catch {
      showToast("Failed to delete.", "error");
    }
  };

  /* ── fee item helpers ── */
  const addFeeItem = () => {
    if (!newParticularName.trim() || !newAmount.trim()) return;
    setFormData((prev) => ({
      ...prev,
      feeItems: [
        ...prev.feeItems,
        { id: Date.now().toString(), particularName: newParticularName.trim(), amount: parseFloat(newAmount) || 0, installment1: false, installment2: false, installment1Amount: 0, installment2Amount: 0 },
      ],
    }));
    setNewParticularName("");
    setNewAmount("");
  };

  const updateFeeItem = (id: string, particularName: string, amount: string) => {
    setFormData((prev) => ({
      ...prev,
      feeItems: prev.feeItems.map((item) =>
        item.id === id ? { ...item, particularName, amount: parseFloat(amount) || 0 } : item
      ),
    }));
  };

  const removeFeeItem = (id: string) => {
    setFormData((prev) => ({ ...prev, feeItems: prev.feeItems.filter((i) => i.id !== id) }));
  };

  const updateInstallmentAmount = (id: string, slot: 1 | 2, value: string) => {
    setFormData((prev) => ({
      ...prev,
      feeItems: prev.feeItems.map((fi) =>
        fi.id === id
          ? { ...fi, [`installment${slot}Amount`]: value }
          : fi
      ),
    }));
  };

  /* ── save ── */
  const handleSave = async () => {
    if (
      !formData.degreeTypeId ||
      !formData.feeId ||
      !formData.degreeId ||
      !formData.courseId ||
      formData.categoryIds.length === 0 ||
      !formData.academicYearId
    ) {
      showToast("Please fill all basic details.", "error");
      return;
    }

    if (formData.feeItems.length === 0) {
      showToast("Please add at least one fee item.", "error");
      return;
    }

    const details = formData.feeItems.map((item) => ({
      particularName: item.particularName,

      amount: Number(item.amount || 0),

      installment1: isSplitItem(item.particularName)
        ? Number(item.installment1Amount || 0) > 0
        : item.installment1,

      installment2: isSplitItem(item.particularName)
        ? Number(item.installment2Amount || 0) > 0
        : item.installment2,

      installment1Amount: Number(item.installment1Amount || 0),

      installment2Amount: Number(item.installment2Amount || 0),
    }));

    /* 🔥 DEBUG LOGS */

    const payload = {
      id: formData.id,
      degreeTypeId: formData.degreeTypeId,
      feeId: formData.feeId,
      feeName: formData.feeName || undefined,
      degreeId: formData.degreeId,
      courseId: formData.courseId,
      categoryId: formData.categoryIds[0],
      academicYearId: formData.academicYearId,
      annualIncomeId: formData.annualIncomeId || undefined,
      deductionYn: formData.deductionYn,
      // deductionAmount only set when deduction is actually enabled
      deductionAmount: formData.deductionYn ? Number(deductionAmount || 0) : 0,
      // fineAmount always saved as configured (auto-applies at payment time after endDate)
      fineAmount: Number(formData.fineAmount || 0),
      // payAmount = what student pays today: after deduction + fine if currently active
      payAmount: Number(payAmount || 0),
      totalAmount: Number(totalFees || 0),
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      fineEndDate: formData.fineEndDate || undefined,
      details,
    };

    setSaving(true);

    try {
      if (formData.id) {

        await updateAdmissionFeeStructure(payload);

      } else {

        await Promise.all(
          formData.categoryIds.map((catId) => {
            const createPayload = {
              degreeTypeId: formData.degreeTypeId,
              feeId: formData.feeId,
              feeName: formData.feeName || undefined,
              degreeId: formData.degreeId,
              courseId: formData.courseId,
              categoryId: catId,
              academicYearId: formData.academicYearId,
              annualIncomeId: formData.annualIncomeId || undefined,
              deductionYn: formData.deductionYn,
              deductionAmount: formData.deductionYn ? Number(deductionAmount || 0) : 0,
              fineAmount: Number(formData.fineAmount || 0),
              payAmount: Number(payAmount || 0),
              totalAmount: Number(totalFees || 0),
              startDate: formData.startDate || undefined,
              endDate: formData.endDate || undefined,
              fineEndDate: formData.fineEndDate || undefined,
              details,
            };


            return createAdmissionFeeStructure(createPayload);
          })
        );

      }

      setModalOpen(false);

      loadList();

      showToast(formData.id ? "Fee structure updated." : "Fee structure created.", "success");

    } catch (any) {
      showToast("Failed to save fee structure.", "error");
    } finally {


      setSaving(false);
    }
  };

  /* ════════════════════════════════════════════
     LIST VIEW (always the page body — modal sits on top)
  ════════════════════════════════════════════ */
  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 text-white shadow-sm bg-primary rounded-2xl shrink-0">
              <Receipt size={18} />
            </div>
            <div>
              <p className="mt-1 text-sm italic font-semibold text-gray-500 sm:text-base">
                Manage fee structures for different degrees, courses, and categories
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FilterPanel
              sections={[
                { title: "Degree", key: "degree", options: degrees.map((d) => ({ label: d.degreeName, value: d.id })) },
                { title: "Course", key: "course", options: courses.map((c) => ({ label: c.name, value: c.id })) },
                { title: "Category", key: "category", options: categoryOptions },
              ]}
              values={listFilters}
              onChange={(key, vals) => setListFilters((prev) => ({ ...prev, [key]: vals }))}
            />
            <Button variant="primary" onClick={openCreate} testId="create-fee-structure-btn">
              <Plus size={18} />
              New Fee Structure
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className="p-0 overflow-hidden border shadow-sm rounded-2xl border-slate-200">
          {listLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 p-16 text-gray-400">
              <span className="w-8 h-8 border-2 rounded-full border-primary/30 border-t-primary animate-spin" />
              <span className="text-sm">Loading fee structures…</span>
            </div>
          ) : filteredFeeStructures.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
              <div className="flex items-center justify-center rounded-full w-14 h-14 bg-slate-100 text-slate-300">
                <Receipt size={26} />
              </div>
              <p className="text-sm font-medium text-gray-500">
                {feeStructures.length === 0
                  ? "No fee structures found. Click \"New Fee Structure\" to create one."
                  : "No results match the selected filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-10 px-4 py-3"></th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-500 min-w-[320px]">Fee Name</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-500 min-w-[150px]">Records</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left uppercase text-slate-500 min-w-[280px]">Programmes</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGroups.map(({ feeName, rows }) => {
                    const isOpen = expandedGroups.has(feeName);
                    return (
                      <>
                        {/* Group header — clickable to expand/collapse */}
                        <tr
                          key={`group-${feeName}`}
                          className="transition border-t cursor-pointer border-slate-100 hover:bg-primary/5"
                          onClick={() => toggleGroup(feeName)}
                        >
                          <td className="px-4 py-3 text-slate-400">
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </td>
                          <td className="px-4 py-3 min-w-[200px]">
                            <span className="text-sm font-bold text-primary">{feeName}</span>
                          </td>
                          <td className="px-4 py-3 min-w-[100px]">
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {rows.length} record{rows.length !== 1 ? "s" : ""}
                            </span>
                          </td>
                          <td className="px-4 py-3 min-w-[280px]">
                            <div className="flex flex-wrap gap-1">
                              {[...new Set(rows.map((r) => degreeName(r.degreeId)))].map((d) => (
                                <span key={d} className="px-2 py-0.5 text-xs rounded-full bg-slate-50 text-slate-500 border border-slate-200 whitespace-nowrap">{d}</span>
                              ))}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded detail rows */}
                        {isOpen && (
                          <tr key={`group-${feeName}-rows`} className="border-t bg-slate-50/60 border-slate-100">
                            <td colSpan={4} className="px-4 py-3">
                              <div className="overflow-hidden bg-white border rounded-lg border-slate-200">
                                <table className="w-full">
                                  <thead className="text-white bg-primary">
                                    <tr>
                                      <th className="px-3 py-2 text-xs font-semibold text-left min-w-[100px]">Programme</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-left min-w-[220px]">Category</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-left min-w-[120px]">Academic Year</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-left min-w-[100px]">Total (₹)</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-left min-w-[100px]">Pay Amount (₹)</th>
                                      <th className="px-3 py-2 text-xs font-semibold text-left min-w-[80px]">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {groupRowsByProgramme(rows).map(({ key, records }) => {
                                      const shortDate = (iso?: string | null) =>
                                        iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "";
                                      const first = records[0];
                                      const programmeKey = `${feeName}::${key}`;
                                      const isProgExpanded = expandedProgrammes.has(programmeKey);
                                      const hasOverflow = records.length > CATEGORY_PREVIEW_COUNT;
                                      const visibleRecords = isProgExpanded ? records : records.slice(0, CATEGORY_PREVIEW_COUNT);
                                      // Programme cell spans every visible category row, plus the "show more" row if present.
                                      const programmeRowSpan = visibleRecords.length + (hasOverflow ? 1 : 0);

                                      return (
                                        <>
                                          {visibleRecords.map((fs, i) => (
                                            <tr key={fs.id} className="border-t border-slate-100 hover:bg-slate-50">
                                              {/* Programme cell — real rowSpan, rendered once per programme */}
                                              {i === 0 && (
                                                <td rowSpan={programmeRowSpan} className="px-3 py-2.5 min-w-[180px] align-top bg-white">
                                                  <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-semibold text-slate-700">{degreeName(first.degreeId)}</span>
                                                    <span className="text-xs text-slate-500">{courseName(first.courseId)}</span>
                                                    <span className="mt-1 text-[10px] font-medium text-slate-400">
                                                      {records.length} categor{records.length !== 1 ? "ies" : "y"}
                                                    </span>
                                                  </div>
                                                </td>
                                              )}

                                              {/* Category cell — one row per category, own line */}
                                              <td className="px-3 py-2 min-w-[110px]">
                                                <div className="flex flex-wrap items-center gap-1">
                                                  <span className="px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100 rounded-full bg-blue-50 whitespace-nowrap">
                                                    {categoryName(fs.categoryId)}
                                                  </span>
                                                  {fs.startDate && fs.endDate && (
                                                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 whitespace-nowrap">
                                                      {shortDate(fs.startDate)}–{shortDate(fs.endDate)}
                                                    </span>
                                                  )}
                                                  {(fs.fineAmount ?? 0) > 0 && fs.endDate && (
                                                    <span
                                                      className={`px-2 py-0.5 text-xs font-semibold rounded-full border whitespace-nowrap ${isFineActive(fs.endDate ?? "")
                                                        ? "bg-red-100 text-red-700 border-red-200"
                                                        : "bg-orange-50 text-orange-700 border-orange-200"
                                                        }`}
                                                      title={isFineActive(fs.endDate ?? "") ? "Fine active" : `Fine from ${shortDate(fs.endDate)}`}
                                                    >
                                                      +₹{(fs.fineAmount ?? 0).toLocaleString("en-IN")}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>

                                              {/* Academic Year */}
                                              <td className="px-3 py-2 text-xs whitespace-nowrap min-w-[120px] text-text">
                                                {academicYearLabel(fs.academicYearId)}
                                              </td>

                                              {/* Total */}
                                              <td className="px-3 py-2">
                                                <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                                                  <IndianRupee size={12} />
                                                  {(fs.totalAmount ?? 0).toLocaleString("en-IN")}
                                                </span>
                                              </td>

                                              {/* Pay Amount — recomputed live so a fine that has since
                                                  kicked in is reflected without needing an edit+save */}
                                              <td className="px-3 py-2">
                                                <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600">
                                                  <IndianRupee size={12} />
                                                  {getEffectivePayAmount(fs).toLocaleString("en-IN")}
                                                </span>
                                              </td>

                                              {/* Actions */}
                                              <td className="px-3 py-2">
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); openEdit(fs); }}
                                                    className="p-1.5 transition rounded-lg text-primary hover:bg-primary/10"
                                                    title="Edit"
                                                  >
                                                    <Pencil size={14} />
                                                  </button>
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); fs.id && handleDelete(fs.id); }}
                                                    className="p-1.5 text-red-500 transition rounded-lg hover:bg-red-50"
                                                    title="Delete"
                                                  >
                                                    <Trash2 size={14} />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}

                                          {/* Show more / show less — keeps a 10-category programme from
                                              blowing out the page height by default */}
                                          {hasOverflow && (
                                            <tr key={`${programmeKey}-toggle`} className="border-t border-dashed border-slate-100 bg-slate-50/40">
                                              <td colSpan={5} className="px-3 py-1.5">
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); toggleProgramme(programmeKey); }}
                                                  className="text-xs font-semibold text-primary hover:underline"
                                                >
                                                  {isProgExpanded
                                                    ? "Show fewer categories"
                                                    : `Show ${records.length - CATEGORY_PREVIEW_COUNT} more categor${records.length - CATEGORY_PREVIEW_COUNT !== 1 ? "ies" : "y"}`}
                                                </button>
                                              </td>
                                            </tr>
                                          )}
                                        </>
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
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!listLoading && allGroupedByFeeName.length > 0 && totalPages > 1 && (
            <div className="px-4 pb-4">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </Card>
      </div>

      {/* ── Create / Edit Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={formData.id ? "Edit Fee Structure" : "New Fee Structure"}
        size="lg"
        testId="fee-structure-modal"
      >
        <div className="space-y-6">
          {/* Basic Details */}
          <div>
            <p className="mb-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Basic Details</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {formData.id ? (
                <div>
                  <label className="block mb-2 text-sm font-medium text-text">
                    Degree Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    data-testid="degree-type-input"
                    readOnly
                    value={degreeTypeOptions.find((o) => o.id === formData.degreeTypeId)?.name ?? ""}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none"
                  />
                </div>
              ) : (
                <SearchableSelect
                  label="Degree Type"
                  required
                  testId="degree-type-select"
                  options={degreeTypeOptions.map((o) => ({ label: o.name ?? "", value: o.id }))}
                  value={formData.degreeTypeId}
                  placeholder="Select Degree Type"
                  onChange={(val) =>
                    setFormData((p) => ({
                      ...p,
                      degreeTypeId: val as string,
                      feeId: "",
                      feeName: "",
                      degreeId: "",
                      courseId: "",
                    }))
                  }
                />
              )}

              {formData.id ? (
                <div>
                  <label className="block mb-2 text-sm font-medium text-text">
                    Fee Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    data-testid="fee-name-input"
                    readOnly
                    value={formData.feeName}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none"
                  />
                </div>
              ) : (
                <SearchableSelect
                  label="Fee Name"
                  required
                  testId="fee-name-select"
                  options={feeNameOptions.map((o) => ({ label: o.name ?? "", value: o.id }))}
                  value={formData.feeId}
                  placeholder={
                    !formData.degreeTypeId
                      ? "Select a degree type first"
                      : feeNameLoading
                      ? "Loading fee names..."
                      : "Select Fee Name"
                  }
                  onChange={(val) => {
                    const selected = feeNameOptions.find((o) => o.id === val);
                    setFormData((p) => ({ ...p, feeId: val as string, feeName: selected?.name ?? "" }));
                  }}
                />
              )}

              <div>
                {formData.id ? (
                  <>
                    <label className="block mb-2 text-sm font-medium text-text">
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      data-testid="academic-year-input"
                      readOnly
                      value={
                        academicYearOptions.find((yr) => yr.id === formData.academicYearId)?.description ||
                        ""
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none"
                    />
                  </>
                ) : (
                  <SearchableSelect
                    label="Academic Year"
                    required
                    testId="academic-year-select"
                    options={academicYearOptions.map((yr) => ({
                      label: yr.description || `${yr.startDate ?? ""} – ${yr.endDate ?? ""}`,
                      value: yr.id,
                    }))}
                    value={formData.academicYearId}
                    placeholder="Select Academic Year"
                    onChange={(val) => setFormData((p) => ({ ...p, academicYearId: val as string }))}
                  />
                )}
              </div>

              {formData.id ? (
                <div>
                  <label className="block mb-2 text-sm font-medium text-text">
                    Degree <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    data-testid="degree-input"
                    readOnly
                    value={degrees.find((d) => d.id === formData.degreeId)?.degreeName ?? ""}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none"
                  />
                </div>
              ) : (
                <SearchableSelect
                  label="Degree"
                  required
                  testId="degree-select"
                  options={degrees
                    .filter((d) => !formData.degreeTypeId || d.degreeTypeId === formData.degreeTypeId)
                    .map((d) => ({ label: d.degreeName, value: d.id }))}
                  value={formData.degreeId}
                  placeholder={formData.degreeTypeId ? "Select Degree" : "Select a degree type first"}
                  onChange={(val) =>
                    setFormData((p) => ({ ...p, degreeId: val as string, courseId: "" }))
                  }
                />
              )}

              {formData.id ? (
                <div>
                  <label className="block mb-2 text-sm font-medium text-text">
                    Course <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    data-testid="course-input"
                    readOnly
                    value={courses.find((c) => c.id === formData.courseId)?.name ?? ""}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none"
                  />
                </div>
              ) : (
                <SearchableSelect
                  label="Course"
                  required
                  testId="course-select"
                  options={courses
                    .filter((c) => c.degreeId === formData.degreeId)
                    .map((c) => ({ label: c.name, value: c.id }))}
                  value={formData.courseId}
                  placeholder={formData.degreeId ? "Select Course" : "Select a degree first"}
                  onChange={(val) => setFormData((p) => ({ ...p, courseId: val as string }))}
                />
              )}

              <SearchableSelect
                label="Annual Income"
                testId="annual-income-select"
                options={incomeOptions}
                value={formData.annualIncomeId}
                placeholder="Select Annual Income"
                onChange={(val) => setFormData((p) => ({ ...p, annualIncomeId: val as string }))}
              />

              {formData.id ? (
                /* editing: single select — changing category updates the one record */
                <SearchableSelect
                  label="Category"
                  required
                  testId="category-select"
                  options={categoryOptions}
                  value={formData.categoryIds[0] ?? ""}
                  placeholder="Select Category"
                  onChange={(val) => setFormData((p) => ({ ...p, categoryIds: [val as string] }))}
                />
              ) : (
                /* creating: multi-select — one record is created per selected category */
                <MultiSelectDropdown
                  label="Category"
                  required
                  options={categoryOptions.map((o) => ({ id: o.value, name: o.label }))}
                  selectedIds={formData.categoryIds}
                  onChange={(ids) => setFormData((p) => ({ ...p, categoryIds: ids }))}
                />
              )}
            </div>
          </div>

          {/* Late Fine Window */}
          <div className="p-4 space-y-3 border border-gray-200 border-dashed rounded-xl bg-gray-50/60">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Late Fine Window</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DateField
                label="Payment Opens"
                testId="fine-start-date-input"
                value={formData.startDate}
                onChange={(v: string) => setFormData((p) => ({ ...p, startDate: v }))}
              />
              <DateField
                label="No-Fine Deadline"
                testId="fine-end-date-input"
                value={formData.endDate}
                onChange={(v: string) => setFormData((p) => ({ ...p, endDate: v }))}
              />
              <DateField
                label="Fine Window Ends"
                testId="fine-window-end-date-input"
                value={formData.fineEndDate}
                onChange={(v: string) => setFormData((p) => ({ ...p, fineEndDate: v }))}
              />
            </div>
            <Input
              label="Fine Amount (₹)"
              placeholder="e.g., 500"
              type="number"
              testId="fine-amount-input"
              value={formData.fineAmount === 0 ? "" : String(formData.fineAmount)}
              onChange={(e) =>
                setFormData((p) => ({ ...p, fineAmount: parseFloat(e.target.value) || 0 }))
              }
            />
          </div>

          {/* Fee Particulars */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Fee Particulars</p>
              <button
                type="button"
                onClick={() => setInstallmentEnabled((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${installmentEnabled
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-primary border-primary hover:bg-primary/10"
                  }`}
              >
                {installmentEnabled ? "Installment Enabled" : "Enable Installment"}
              </button>
            </div>

            {/* Add Row */}
            <div className="p-4 mb-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  label="Particular Name"
                  placeholder="e.g., Tuition Fee"
                  testId="fee-particulars-input"
                  value={newParticularName}
                  onChange={(e) => setNewParticularName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addFeeItem(); }}
                />
                <Input
                  label="Amount"
                  placeholder="e.g., 5000"
                  type="number"
                  testId="fee-amount-input"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addFeeItem(); }}
                />
                <div className="flex items-end">
                  <Button onClick={addFeeItem} className="w-full" testId="add-fee-btn">
                    <Plus size={16} />
                    Add Fee
                  </Button>
                </div>
              </div>
            </div>

            {/* Items Table */}
            {formData.feeItems.length > 0 ? (
              <div className="mb-4 overflow-x-auto">
                <table data-testid="fee-items-table" className="w-full overflow-hidden border border-gray-200 rounded-lg">
                  <thead className="text-white bg-primary">
                    <tr>
                      <th className="px-3 py-2 text-xs font-semibold text-left">S.No</th>
                      <th className="px-3 py-2 text-xs font-semibold text-left">Particular Name</th>
                      <th className="px-3 py-2 text-xs font-semibold text-left">Amount (₹)</th>
                      {installmentEnabled && (
                        <>
                          <th className="px-3 py-2 text-xs font-semibold text-center">Installment 1</th>
                          <th className="px-3 py-2 text-xs font-semibold text-center">Installment 2</th>
                        </>
                      )}
                      <th className="px-3 py-2 text-xs font-semibold text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.feeItems.map((item, index) => (
                      <tr key={item.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-text">{index + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            data-testid={`fee-item-particulars-${index}`}
                            value={item.particularName}
                            onChange={(e) => updateFeeItem(item.id, e.target.value, item.amount.toString())}
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:border-primary"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            data-testid={`fee-item-amount-${index}`}
                            value={item.amount}
                            onChange={(e) => updateFeeItem(item.id, item.particularName, e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:border-primary"
                          />
                        </td>
                        {installmentEnabled && (
                          <>
                            <td className="px-3 py-2 text-center">
                              {isSplitItem(item.particularName) ? (
                                <div className="flex flex-col items-center gap-1">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    data-testid={`installment-1-amount-${index}`}
                                    value={item.installment1Amount}
                                    onChange={(e) => updateInstallmentAmount(item.id, 1, e.target.value.replace(/[^0-9.]/g, ""))}
                                    placeholder="₹"
                                    className="w-24 px-2 py-1 text-xs text-center border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                                  />
                                  {(() => {
                                    const i1 = Number(item.installment1Amount) || 0;
                                    const i2 = Number(item.installment2Amount) || 0;
                                    return (i1 + i2 !== item.amount) && (i1 > 0 || i2 > 0) ? (
                                      <span className="text-[10px] text-red-500">
                                        Remaining: ₹{(item.amount - i1 - i2).toLocaleString()}
                                      </span>
                                    ) : null;
                                  })()}
                                </div>
                              ) : (
                                <input
                                  type="checkbox"
                                  data-testid={`installment-1-${index}`}
                                  checked={item.installment1}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      feeItems: prev.feeItems.map((fi) =>
                                        fi.id === item.id ? { ...fi, installment1: e.target.checked } : fi
                                      ),
                                    }))
                                  }
                                  className="w-4 h-4 cursor-pointer accent-primary"
                                />
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isSplitItem(item.particularName) ? (
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  data-testid={`installment-2-amount-${index}`}
                                  value={item.installment2Amount}
                                  onChange={(e) => updateInstallmentAmount(item.id, 2, e.target.value.replace(/[^0-9.]/g, ""))}
                                  placeholder="₹"
                                  className="w-24 px-2 py-1 text-xs text-center border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  data-testid={`installment-2-${index}`}
                                  checked={item.installment2}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      feeItems: prev.feeItems.map((fi) =>
                                        fi.id === item.id ? { ...fi, installment2: e.target.checked } : fi
                                      ),
                                    }))
                                  }
                                  className="w-4 h-4 cursor-pointer accent-primary"
                                />
                              )}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2">
                          <button
                            data-testid={`remove-fee-item-${index}`}
                            onClick={() => removeFeeItem(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 mb-4 text-center border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500">No fee items added yet.</p>
              </div>
            )}
          </div>

          {/* Deduction */}
          <div>
            <p className="mb-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Deduction Settings</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="deduction-enabled-checkbox"
                  checked={formData.deductionYn}
                  onChange={(e) => setFormData((p) => ({ ...p, deductionYn: e.target.checked }))}
                  className="w-5 h-5 border-gray-300 rounded cursor-pointer"
                />
                <span className="text-sm font-medium text-text">Enable Deduction</span>
              </label>

              {formData.deductionYn && (
                <div className="flex items-end gap-4 ml-4">
                  <div className="min-w-fit">
                    <label className="block mb-2 text-sm font-medium text-text">
                      Deduction Percentage (%)
                    </label>
                    <input
                      type="number"
                      data-testid="deduction-percentage-input"
                      min="0"
                      max="100"
                      value={formData.deductionPercentage === 0 ? "" : formData.deductionPercentage}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setFormData((p) => ({ ...p, deductionPercentage: raw === "" ? 0 : parseFloat(raw) || 0 }));
                      }}
                      className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <p className="mb-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Fee Summary</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text">Total Fees:</span>
                <span className="text-lg font-bold text-primary">₹{totalFees.toLocaleString()}</span>
              </div>
              {formData.deductionYn && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium text-text">
                    Deduction ({formData.deductionPercentage}%):
                  </span>
                  <span className="text-sm font-semibold text-red-500">
                    -₹{deductionAmount.toLocaleString()}
                  </span>
                </div>
              )}
              {formData.fineAmount > 0 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium text-text">
                    Late Fine{" "}
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold align-middle ${fineActive ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"
                        }`}
                    >
                      {fineActive ? "active" : `applies after ${formData.endDate || "end date"}`}
                    </span>
                    :
                  </span>
                  <span className={`text-sm font-semibold ${fineActive ? "text-amber-600" : "text-slate-300 line-through"}`}>
                    +₹{formData.fineAmount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t-2 border-primary">
                <span className="text-sm font-semibold text-text">Final Total:</span>
                <span className="text-xl font-bold text-primary">₹{payAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Conditional-charge notice — informs the admin that Non-Karnataka domicile
              and (for PG) in-service candidates get an extra amount added on top of
              this base fee at payment time, configured separately in Conditional Charges. */}
          <div className="flex items-start gap-2 p-3 text-xs text-indigo-700 border border-indigo-200 rounded-lg bg-indigo-50">
            <span className="mt-0.5 shrink-0">ⓘ</span>
            <span>
              This is the base fee only. Non-Karnataka domicile candidates
              {isSelectedDegreeTypePg && " and PG in-service candidates"} will have an
              additional conditional charge applied on top of this amount at payment,
              configured separately under Conditional Charges — no need to add it here.
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
            <Button variant="outline" testId="cancel-btn" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" testId="save-btn" onClick={handleSave} disabled={saving}>
              <Save size={16} />
              {saving ? "Saving…" : formData.id ? "Save changes" : "Save Fee Structure"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className="fixed z-[100] bottom-6 right-6">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}
    </>
  );
}