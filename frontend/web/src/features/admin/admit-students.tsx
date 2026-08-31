import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Search, CheckCircle, XCircle, ChevronDown, ChevronRight,
  GraduationCap, Users, UserCheck, X, BookOpen,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import FilterPanel from "../../components/ui/FilterPanel";
import Pagination from "../../components/ui/Pagination";
import AppLayout from "../../components/layouts/AppLayout";
import Toast from "../../components/ui/Toast";
import { getDegrees } from "../../services/degreeService";
import type { Degree } from "../../services/degreeService";
import { getCourses } from "../../services/courseService";
import type { Course } from "../../services/courseService";
import { getLookupsByType } from "../../services/lookupService";
import { getApplicationVerifications, updateApplicationVerification } from "../../services/applicationVerificationService";
import { admitStudent, getAdmittedStudents, updateAdmittedStudent } from "../../services/admitStudentService";
import { getApplications } from "../../services/applicationService";
import { getAllApplicationCourseDetails, getCourseDetailsByApplicationId } from "../../services/applicationCourseDetailService";
import { getAcademicYears, type AcademicYear } from "../../services/academicYearService";
import { getAllFeeCollections } from "../../services/feeCollectionService";
import { getAllFeeCollectionManualsPaged } from "../../services/feecollectionmanualService";
// isAdmissionFeePaid lives on this list DTO (same source document-verification.tsx
// uses) — applicationVerificationService's own records don't carry fee status.
import {
  getDocumentVerificationList,
  type DocumentVerificationListItemDto,
} from "../../services/applicationQueryService";

/* ─────────────────────────────────── TYPES ─────────────────────────────── */

type AdmittedStudent = {
  verificationId: string;
  applicationId: string;
  appNo: string;
  installment?: number;
  name: string;
  phone: string;
  email: string;
  categoryName: string;
  courseName: string;
  degreeName: string;
  // Raw ids — needed (not just the display names) to group by Degree Type →
  // Degree → Course the same way document-verification.tsx does.
  degreeId: string;
  courseId: string;
  degreeTypeId: string;
  isAdmitted: boolean;
  admittedStudentId?: string; // id from AdmittedStudent record, for updates
  academicYearDesc: string | null;
  batchYear: string | null;
  // Drives auto-admission — not shown directly in the UI (isAdmitted/StatusBadge
  // reflect the actual outcome once the auto-admit call completes).
  isAdmissionFeePaid?: boolean;
};

// Level-3 (innermost) group: students sharing the same courseId within a degree.
type CourseGroup = {
  courseId: string;
  courseName: string;
  degreeId: string;
  degreeName: string;
  students: AdmittedStudent[];
};

// Level-2 group: courses sharing the same degreeId within a degree type.
type DegreeGroup = {
  degreeId: string;
  degreeName: string;
  byCourse: CourseGroup[];
  students: AdmittedStudent[];
};

// Level-1 (outermost) group: degrees sharing the same degreeTypeId.
type DegreeTypeGroup = {
  degreeTypeId: string;
  byDegree: DegreeGroup[];
};

/* ────────────────────────────── CONSTANTS ──────────────────────────────── */

const YEAR_COLOR_PALETTE = [
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
];

/* ──────────────────────────────── HELPERS ──────────────────────────────── */

// Groups students into DegreeType → Degree → Course, mirroring
// document-verification.tsx's groupedByDegreeType exactly (same key scheme:
// "unassigned" fallback at every level so ungrouped rows still render).
function groupByDegreeType(students: AdmittedStudent[]): DegreeTypeGroup[] {
  const typeMap = new Map<string, AdmittedStudent[]>();
  for (const s of students) {
    const key = s.degreeTypeId || "unassigned";
    if (!typeMap.has(key)) typeMap.set(key, []);
    typeMap.get(key)!.push(s);
  }

  return Array.from(typeMap.entries()).map(([degreeTypeId, typeRows]) => {
    const degreeGroupMap = new Map<string, AdmittedStudent[]>();
    for (const s of typeRows) {
      const key = s.degreeId || "unassigned";
      if (!degreeGroupMap.has(key)) degreeGroupMap.set(key, []);
      degreeGroupMap.get(key)!.push(s);
    }

    const byDegree: DegreeGroup[] = Array.from(degreeGroupMap.entries()).map(([degreeId, degreeRows]) => {
      const courseGroupMap = new Map<string, AdmittedStudent[]>();
      for (const s of degreeRows) {
        const key = s.courseId || "unassigned";
        if (!courseGroupMap.has(key)) courseGroupMap.set(key, []);
        courseGroupMap.get(key)!.push(s);
      }
      const byCourse: CourseGroup[] = Array.from(courseGroupMap.entries()).map(([courseId, courseRows]) => ({
        courseId,
        courseName: courseRows[0]?.courseName ?? "—",
        degreeId,
        degreeName: courseRows[0]?.degreeName ?? "—",
        students: courseRows,
      }));
      return {
        degreeId,
        degreeName: degreeRows[0]?.degreeName ?? "—",
        byCourse,
        students: degreeRows,
      };
    });

    return { degreeTypeId, byDegree };
  });
}

// Bug fix: getAllApplicationCourseDetails()/getCourseDetailsByApplicationId()
// return one row per course *preference* for multi-preference applications,
// all sharing the same applicationId. Blindly keeping "whichever row is
// first/last" (a plain Map build or `details?.[0]`) means a multi-preference
// student can get attributed to a course they merely listed as a preference,
// not the one they were actually accepted/admitted into — showing up under
// the wrong Degree/Course group entirely. Always prefer the row with
// acceptedYn === true (same source of truth document-verification.tsx uses
// for "the course this application was actually accepted into"); fall back
// to the first row only when nothing is marked accepted yet.
function pickAcceptedCourseDetail<T extends { acceptedYn?: boolean | null }>(
  details: T[] | null | undefined
): T | undefined {
  if (!details || details.length === 0) return undefined;
  return details.find((d) => d.acceptedYn) ?? details[0];
}

// Lets TS infer the settled-result's fulfilled type from whatever Promise.allSettled
// was actually called with, instead of us hand-typing (and risking drift from) it.
function isFulfilled<T>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> {
  return r.status === "fulfilled";
}

/* ──────────────────────── SUMMARY CARD ─────────────────────────────────── */

function SummaryCard({
  icon, label, value, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className={`flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm`}>
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium tracking-wide uppercase text-slate-400">{label}</p>
        <p className="text-xl font-bold text-text">{value}</p>
      </div>
    </div>
  );
}

/* ──────────────────────── STATUS BADGE ─────────────────────────────────── */

function StatusBadge({ isAdmitted }: { isAdmitted: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${isAdmitted
        ? "bg-blue-100 text-blue-700 border border-blue-200"
        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
        }`}
    >
      {isAdmitted ? <UserCheck size={11} /> : <CheckCircle size={11} />}
      {isAdmitted ? "Admitted" : "Accepted"}
    </span>
  );
}

/* ─────────────────── DEGREE / COURSE ACCORDION COMPONENTS ──────────────────
   Three-level nesting — DegreeType (tabs, in the main page) → Degree →
   Course — matching document-verification.tsx's groupedByDegreeType UI
   exactly, down to the box styling and badge counts.                       */

function CourseAccordion({
  group,
  isOpen,
  onToggle,
  onView,
  yearColorMap,
}: {
  group: CourseGroup;
  isOpen: boolean;
  onToggle: () => void;
  onView: (s: AdmittedStudent) => void;
  yearColorMap: Map<string, string>;
}) {
  const admittedCount = group.students.filter((s) => s.isAdmitted).length;

  const INNER_PAGE_SIZE = 10;
  const [innerPage, setInnerPage] = useState(1);
  const innerTotalPages = Math.max(1, Math.ceil(group.students.length / INNER_PAGE_SIZE));
  const pagedStudents = group.students.slice((innerPage - 1) * INNER_PAGE_SIZE, innerPage * INNER_PAGE_SIZE);

  return (
    <div
      className={`overflow-hidden bg-white border rounded-xl transition-shadow ${isOpen ? "border-indigo-200 shadow-sm" : "border-slate-200"}`}
    >
      <div
        className="flex flex-wrap items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50"
        onClick={onToggle}
      >
        <span className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition ${isOpen ? "bg-indigo-100 text-indigo-600" : "text-slate-400"}`}>
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span className="flex items-center justify-center w-6 h-6 text-indigo-500 rounded-lg shrink-0 bg-indigo-50">
          <BookOpen size={12} />
        </span>
        <span className="text-sm font-semibold truncate text-slate-700">
          {group.courseName}
        </span>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 shrink-0">
          <Users size={10} />
          {group.students.length} student{group.students.length !== 1 ? "s" : ""}
        </span>
        {/* Progress bar — admitted / total, same visual as before */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden w-[80px]">
            <div
              className="h-full transition-all bg-blue-500 rounded-full"
              style={{ width: `${group.students.length ? (admittedCount / group.students.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {admittedCount}/{group.students.length} admitted
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-slate-100 bg-slate-50/40">
          <div className="m-3 overflow-hidden bg-white border rounded-lg border-slate-200">
            {/* Mobile: stacked rows */}
            <div className="sm:hidden">
              {pagedStudents.map((s, idx) => (
                <div
                  key={s.verificationId}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 ${idx !== 0 ? "border-t border-slate-100" : ""}`}
                >
                  <p className="text-sm font-semibold truncate text-text">{s.name}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge isAdmitted={s.isAdmitted} />
                    <button
                      onClick={(e) => { e.stopPropagation(); onView(s); }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-white bg-primary border border-primary/30 hover:bg-primary/10 hover:text-primary transition"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: real table — column widths are fixed via colgroup, so they never shift with content length */}
            <table className="hidden w-full text-sm border-collapse table-fixed sm:table">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[18%]" />
                <col className="w-[26%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[11%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead>
                <tr className="text-xs font-semibold text-white bg-primary">
                  <th className="px-3 py-2 text-center">Student</th>
                  <th className="px-3 py-2 text-center">USN</th>
                  <th className="px-3 py-2 text-center">Contact</th>
                  <th className="px-3 py-2 text-center">Category</th>
                  <th className="px-3 py-2 text-center">Installment</th>
                  <th className="px-3 py-2 text-center">Academic Year</th>
                  <th className="px-3 py-2 text-center">Batch Year</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedStudents.map((s, idx) => {
                  const yearColorClass = s.academicYearDesc
                    ? (yearColorMap.get(s.academicYearDesc) ?? "bg-gray-100 text-gray-600 border-gray-200")
                    : null;
                  return (
                    <tr
                      key={s.verificationId}
                      className={`transition-colors hover:bg-primary/5 ${idx !== 0 ? "border-t border-slate-100" : ""}`}
                    >
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-semibold truncate text-text" title={s.name}>{s.name}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-block max-w-full font-mono text-[12.5px] font-semibold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 tracking-wide truncate align-middle">{s.appNo}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-[13px] font-semibold truncate text-slate-700" title={s.phone}>{s.phone}</p>
                        <p className="text-[13px] font-semibold truncate text-slate-500" title={s.email}>{s.email}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-block max-w-full px-2 py-0.5 text-[13px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100 truncate align-middle">
                          {s.categoryName}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-[13px] font-semibold text-slate-600">
                        {s.installment ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {s.academicYearDesc ? (
                          <span className={`inline-flex items-center max-w-full px-2 py-0.5 rounded-full text-xs font-semibold border align-middle truncate ${yearColorClass}`}>
                            {s.academicYearDesc}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {s.batchYear ? (
                          <span className="inline-flex items-center max-w-full px-2 py-0.5 rounded-full text-xs font-bold border align-middle truncate text-teal-700 bg-teal-50 border-teal-200">
                            {s.batchYear}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <StatusBadge isAdmitted={s.isAdmitted} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); onView(s); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-white bg-primary border border-primary/30 hover:bg-primary/10 hover:text-primary transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {innerTotalPages > 1 && (
              <div className="px-2 pb-3" onClick={(e) => e.stopPropagation()}>
                <Pagination page={innerPage} totalPages={innerTotalPages} onPageChange={setInnerPage} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DegreeAccordion({
  group,
  isOpen,
  onToggle,
  expandedCourseKeys,
  onToggleCourse,
  onView,
  yearColorMap,
  degreeTypeId,
}: {
  group: DegreeGroup;
  isOpen: boolean;
  onToggle: () => void;
  expandedCourseKeys: Set<string>;
  onToggleCourse: (key: string) => void;
  onView: (s: AdmittedStudent) => void;
  yearColorMap: Map<string, string>;
  degreeTypeId: string;
}) {
  const admittedCount = group.students.filter((s) => s.isAdmitted).length;

  return (
    <div
      className={`overflow-hidden bg-white border rounded-xl transition-shadow ${isOpen ? "border-primary/30 shadow-sm" : "border-slate-200"}`}
    >
      <div
        className="flex flex-wrap items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-slate-50"
        onClick={onToggle}
      >
        <span className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition ${isOpen ? "bg-primary/15 text-primary" : "text-slate-400"}`}>
          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <span className="text-sm font-semibold truncate text-slate-700">
          {group.degreeName}
        </span>
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 shrink-0">
          {group.byCourse.length} course{group.byCourse.length === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 shrink-0">
          {group.students.length} student{group.students.length !== 1 ? "s" : ""}
        </span>
        {/* Progress bar — admitted / total, same visual as before */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden w-[80px]">
            <div
              className="h-full transition-all bg-blue-500 rounded-full"
              style={{ width: `${group.students.length ? (admittedCount / group.students.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {admittedCount}/{group.students.length} admitted
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-100 pt-2.5 bg-slate-50/40">
          {group.byCourse.map((courseGroup) => {
            const csKey = `cs:${degreeTypeId}::${group.degreeId}::${courseGroup.courseId}`;
            return (
              <CourseAccordion
                key={csKey}
                group={courseGroup}
                isOpen={expandedCourseKeys.has(csKey)}
                onToggle={() => onToggleCourse(csKey)}
                onView={onView}
                yearColorMap={yearColorMap}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────── MAIN PAGE ────────────────────────────────── */

export default function AdmitStudentsPage() {
  /* ── state ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({ degree: [], course: [] });
  const [students, setStudents] = useState<AdmittedStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<AdmittedStudent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [remark, setRemark] = useState("");
  const [actionLoading, setActionLoading] = useState<"admit" | "reject" | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [degreeOptions, setDegreeOptions] = useState<{ label: string; value: string }[]>([]);
  const [courseOptions, setCourseOptions] = useState<{ label: string; value: string }[]>([]);
  // expandedGroups holds BOTH degree-level ("dg:...") and course-level ("cs:...")
  // keys — same scheme document-verification.tsx uses.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeDegreeTypeTab, setActiveDegreeTypeTab] = useState<string | null>(null);
  // Degree.id -> degreeTypeId, and degreeTypeId -> display name — same two
  // maps document-verification.tsx builds, used to group/tab by Degree Type.
  const [degreeTypeNameMap, setDegreeTypeNameMap] = useState<Record<string, string>>({});

  /* ── toast helper ── */
  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ── auto-admit on fee payment ── */
  // Tracks applicationIds currently mid-admit so the initial-load check and the
  // background poll (below) never fire admitStudent twice for the same student.
  const autoAdmittingRef = useRef<Set<string>>(new Set());
  const studentsRef = useRef<AdmittedStudent[]>([]);
  useEffect(() => { studentsRef.current = students; }, [students]);
  // Populated in the fetch effect below; reused here (and in handleAction)
  // so patched rows keep a correct degreeTypeId for the grouping tabs.
  const degreeToDegreeTypeIdRef = useRef<Map<string, string>>(new Map());

  const runAutoAdmit = useCallback(async (candidates: AdmittedStudent[]) => {
    const eligible = candidates.filter(
      (s) => s.isAdmissionFeePaid && !s.isAdmitted && !autoAdmittingRef.current.has(s.applicationId)
    );
    if (eligible.length === 0) return;

    eligible.forEach((s) => autoAdmittingRef.current.add(s.applicationId));

    const results = await Promise.allSettled(
      eligible.map(async (s) => {
        // Same call the manual "Admit" button uses.
        const result = await admitStudent({
          applicationId: s.applicationId,
          applicationNo: s.appNo,
          name: s.name,
          remarks: "Auto-admitted — admission fee paid",
        });
        const updatedCourseDetails = await getCourseDetailsByApplicationId(s.applicationId).catch(() => null);
        // Same attribution bug/fix as the initial fetch: pick the accepted
        // preference row, not just whichever one happens to be first.
        // Explicit type param — inference through the .catch(() => null)
        // fallback otherwise collapses to just the {acceptedYn} constraint.
        const cd = pickAcceptedCourseDetail<Awaited<ReturnType<typeof getCourseDetailsByApplicationId>>[number]>(
          updatedCourseDetails
        );
        return { verificationId: s.verificationId, admittedStudentId: result.id, cd };
      })
    );

    eligible.forEach((s) => autoAdmittingRef.current.delete(s.applicationId));

    const succeeded = results.filter(isFulfilled).map((r) => r.value);

    if (succeeded.length === 0) return;

    setStudents((prev) =>
      prev.map((s) => {
        const match = succeeded.find((m) => m.verificationId === s.verificationId);
        if (!match) return s;
        return {
          ...s,
          isAdmitted: true,
          admittedStudentId: match.admittedStudentId,
          ...(match.cd
            ? {
              degreeId: match.cd.degreeId,
              courseId: match.cd.courseId,
              degreeTypeId: degreeToDegreeTypeIdRef.current.get(match.cd.degreeId) ?? s.degreeTypeId,
            }
            : {}),
        };
      })
    );

    showToast(
      `${succeeded.length} student${succeeded.length === 1 ? "" : "s"} auto-admitted after fee payment.`,
      "success"
    );
  }, [showToast]);

  /* ── fetch ── */
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [degreesData, coursesData, categories, degreeTypes, verifications, admittedList, allCourseDetails, allApplications, academicYears, documentVerificationList, allFeeCollections, allFeeCollectionManuals] = await Promise.all([
          getDegrees(),
          getCourses(),
          getLookupsByType("Category", ""),
          getLookupsByType("DegreeType"), // for the Degree Type → Degree → Course grouping
          getApplicationVerifications(),
          getAdmittedStudents(),
          getAllApplicationCourseDetails(),   // bulk — no per-student course calls
          getApplications(),                 // bulk — eliminates N per-student calls
          getAcademicYears().catch(() => [] as AcademicYear[]),
          getDocumentVerificationList().catch(() => [] as DocumentVerificationListItemDto[]), // fallback only, see feePaidByAppId below
          getAllFeeCollections().catch(() => []),           // bulk — online admission fee payments, for per-course scoping
          getAllFeeCollectionManualsPaged().catch(() => []),     // bulk — manual admission fee receipts, for per-course scoping
        ]);

        // Build lookup maps — all O(1)
        const admittedMap = new Map(admittedList.map((a) => [a.applicationId, a]));
        const categoryMap = new Map(categories.map((c) => [c.id, c.name ?? c.code ?? "-"]));
        const degreeMap = new Map(degreesData.map((d: Degree) => [d.id, d.degreeName]));
        const courseMap = new Map(coursesData.map((c: Course) => [c.id, c.name]));
        // Degree.id -> degreeTypeId, and degreeTypeId -> display name — same
        // pair of maps document-verification.tsx builds for its DegreeType tabs.
        const degreeToDegreeTypeId = new Map(degreesData.map((d: Degree) => [d.id, d.degreeTypeId ?? ""]));
        const degreeTypeIdToName = Object.fromEntries(
          degreeTypes.map((dt) => [dt.id, dt.name ?? "—"])
        );
        degreeToDegreeTypeIdRef.current = degreeToDegreeTypeId;

        // Bug fix: allCourseDetails has one row per course *preference*, all
        // sharing the same applicationId for multi-preference applications.
        // A plain `new Map(allCourseDetails.map(cd => [cd.applicationId, cd]))`
        // keeps whichever row is LAST in the array — not necessarily the one
        // the student was actually accepted into — so a multi-preference
        // student could be attributed to the wrong degree/course entirely.
        // Always prefer the row with acceptedYn === true.
        const cdByAppId = new Map<string, (typeof allCourseDetails)[number]>();
        for (const cd of allCourseDetails) {
          const existing = cdByAppId.get(cd.applicationId);
          const cdAccepted = !!(cd as { acceptedYn?: boolean | null }).acceptedYn;
          const existingAccepted = existing ? !!(existing as { acceptedYn?: boolean | null }).acceptedYn : false;
          if (!existing || (cdAccepted && !existingAccepted)) {
            cdByAppId.set(cd.applicationId, cd);
          }
        }

        const appByAppId = new Map(allApplications.map((a) => [a.id, a]));

        // Per-course admission-fee-paid, not per-application — a
        // multi-preference student who paid for one preference but got
        // accepted into a different one must NOT count as paid for the
        // accepted course. Same scoping fix already applied in
        // document-verification.tsx's Admission Fee card.
        const paidCourseIdsByAppId = new Map<string, Set<string>>();
        const addPaidCourse = (applicationId: string | undefined | null, courseId: string | undefined | null) => {
          if (!applicationId || !courseId) return;
          const set = paidCourseIdsByAppId.get(applicationId) ?? new Set<string>();
          set.add(courseId);
          paidCourseIdsByAppId.set(applicationId, set);
        };
        allFeeCollections
          .filter((f) => (f.feeType ?? "").toLowerCase().includes("admission fee") && (f.status ?? "").toUpperCase() === "SUCCESS")
          .forEach((f) => addPaidCourse(f.applicationId, f.courseId));
        allFeeCollectionManuals
          .filter((f) => (f.feeName ?? "").toLowerCase().includes("admission fee"))
          .forEach((f) => addPaidCourse(f.appId, f.courseId));

        // Fallback only — used when neither fee list has any courseId at all
        // for a given application (legacy records predating that field), in
        // which case we can't scope and fall back to the old application-
        // wide flag rather than wrongly treating everyone as unpaid.
        const feePaidByAppId = new Map(
          documentVerificationList.map((item) => [item.id, !!item.isAdmissionFeePaid])
        );

        setDegreeOptions(degreesData.map((d: Degree) => ({ label: d.degreeName, value: d.degreeName })));
        setCourseOptions(coursesData.map((c: Course) => ({ label: c.name, value: c.name })));
        setDegreeTypeNameMap(degreeTypeIdToName);

        const accepted = verifications.filter((v) => v.verificationStatus === "Accepted");

        // Pure map — no async, no per-student HTTP calls
        const rows: AdmittedStudent[] = accepted.map((v) => {
          const app = appByAppId.get(v.applicationId);
          const cd = cdByAppId.get(v.applicationId);
          const admittedRecord = admittedMap.get(v.applicationId);

          // Academic Year — the application's own academicYearId (when it applied).
          // Batch Year — from the course detail's batchId when present (e.g. lateral
          // entry into a different batch), otherwise falls back to the application's
          // academicYearId so Batch Year is always shown for every student.
          const batchId = cd?.batchId;
          const batchMatch = batchId ? academicYears.find((y) => y.id === batchId) : undefined;
          const currentAcademicYearId = app?.academicYearId;
          const currentYearMatch = currentAcademicYearId
            ? academicYears.find((y) => y.id === currentAcademicYearId)
            : undefined;
          const batchYearValue = batchMatch?.batchYear ?? currentYearMatch?.batchYear;

          const degreeId = cd?.degreeId ?? "";

          return {
            verificationId: v.id!,
            applicationId: v.applicationId,
            appNo: v.appNo ?? "-",
            installment: v.installment,
            name: app?.name ?? "-",
            phone: app?.phone ?? "-",
            email: app?.email ?? "-",
            categoryName: app?.categoryId ? (categoryMap.get(app.categoryId) ?? "-") : "-",
            degreeName: cd ? (degreeMap.get(cd.degreeId) ?? "-") : "-",
            courseName: cd ? (courseMap.get(cd.courseId) ?? "-") : "-",
            degreeId,
            courseId: cd?.courseId ?? "",
            degreeTypeId: degreeId ? (degreeToDegreeTypeId.get(degreeId) ?? "") : "",
            isAdmitted: admittedRecord?.admitYn === true,
            admittedStudentId: admittedRecord?.id,
            academicYearDesc: currentYearMatch?.description ?? null,
            batchYear: batchYearValue ? `${batchYearValue}` : null,
            isAdmissionFeePaid: paidCourseIdsByAppId.has(v.applicationId)
              ? !!cd?.courseId && paidCourseIdsByAppId.get(v.applicationId)!.has(cd.courseId)
              : feePaidByAppId.get(v.applicationId) ?? false,
          };
        });

        setStudents(rows);
        runAutoAdmit(rows); // catch students who were already fee-paid as of this load
      } catch (err) {
        console.error(err);
        showToast("Failed to load students.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [showToast, runAutoAdmit]);

  /* ── background poll: catch fee payments that happen while this page stays
     open, so a student is auto-admitted without the admin refreshing. Mirrors
     the poll in document-verification.tsx — quietly patches isAdmissionFeePaid
     onto rows already loaded; never triggers the full-page loading spinner. ── */
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [documentVerificationList, allFeeCollections, allFeeCollectionManuals] = await Promise.all([
          getDocumentVerificationList(),
          getAllFeeCollections().catch(() => []),
          getAllFeeCollectionManualsPaged().catch(() => []),
        ]);

        const paidCourseIdsByAppId = new Map<string, Set<string>>();
        const addPaidCourse = (applicationId: string | undefined | null, courseId: string | undefined | null) => {
          if (!applicationId || !courseId) return;
          const set = paidCourseIdsByAppId.get(applicationId) ?? new Set<string>();
          set.add(courseId);
          paidCourseIdsByAppId.set(applicationId, set);
        };
        allFeeCollections
          .filter((f) => (f.feeType ?? "").toLowerCase().includes("admission fee") && (f.status ?? "").toUpperCase() === "SUCCESS")
          .forEach((f) => addPaidCourse(f.applicationId, f.courseId));
        allFeeCollectionManuals
          .filter((f) => (f.feeName ?? "").toLowerCase().includes("admission fee"))
          .forEach((f) => addPaidCourse(f.appId, f.courseId));

        // Fallback only, same as the initial load — used solely when neither
        // fee list has any courseId at all for an application (legacy data).
        const feePaidByAppId = new Map(
          documentVerificationList.map((item) => [item.id, !!item.isAdmissionFeePaid])
        );

        const patched = studentsRef.current.map((s) => {
          const scoped = paidCourseIdsByAppId.has(s.applicationId)
            ? !!s.courseId && paidCourseIdsByAppId.get(s.applicationId)!.has(s.courseId)
            : feePaidByAppId.get(s.applicationId);
          return scoped === undefined ? s : { ...s, isAdmissionFeePaid: scoped };
        });

        setStudents(patched);
        runAutoAdmit(patched);
      } catch {
        // Silent — a missed background poll shouldn't interrupt the admin's session.
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [runAutoAdmit]);

  /* ── group toggle ── */
  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  /* ── reset on filter/search change ── */
  useEffect(() => {
    setExpandedGroups(new Set());
  }, [searchQuery, filters]);

  /* ── filtered + grouped ── */
  const filteredStudents = useMemo(() =>
    students.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || s.appNo.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
      const matchDegree = filters.degree.length === 0 || filters.degree.includes(s.degreeName);
      const matchCourse = filters.course.length === 0 || filters.course.includes(s.courseName);
      return matchSearch && matchDegree && matchCourse;
    }),
    [searchQuery, filters, students]
  );

  // Level 1: Degree Type → Level 2: Degree → Level 3: Course.
  const groupedByDegreeType = useMemo(() => groupByDegreeType(filteredStudents), [filteredStudents]);

  const degreeTypeName = useCallback(
    (id: string) => (id ? (degreeTypeNameMap[id] ?? "—") : "Unassigned"),
    [degreeTypeNameMap]
  );

  // Default to (or fall back to) the first available Degree Type tab whenever
  // the grouped data changes and the current tab no longer exists.
  useEffect(() => {
    if (groupedByDegreeType.length === 0) return;
    const stillExists = groupedByDegreeType.some((g) => g.degreeTypeId === activeDegreeTypeTab);
    if (!stillExists) setActiveDegreeTypeTab(groupedByDegreeType[0].degreeTypeId);
  }, [groupedByDegreeType, activeDegreeTypeTab]);

  // Auto-expand every level when the person is actively searching/filtering,
  // so matches aren't hidden behind collapsed accordions — same behavior as
  // document-verification.tsx.
  const hasActiveFilterForExpansion = searchQuery.trim() !== "" || Object.values(filters).some((f) => f.length > 0);
  useEffect(() => {
    if (!hasActiveFilterForExpansion) {
      setExpandedGroups(new Set());
      return;
    }
    const next = new Set<string>();
    groupedByDegreeType.forEach(({ degreeTypeId, byDegree }) => {
      byDegree.forEach(({ degreeId, byCourse }) => {
        next.add(`dg:${degreeTypeId}::${degreeId}`);
        byCourse.forEach((c) => next.add(`cs:${degreeTypeId}::${degreeId}::${c.courseId}`));
      });
    });
    setExpandedGroups(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filters]);

  const yearColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    for (const s of filteredStudents) {
      const label = s.academicYearDesc;
      if (label && !map.has(label)) {
        map.set(label, YEAR_COLOR_PALETTE[i % YEAR_COLOR_PALETTE.length]);
        i++;
      }
    }
    return map;
  }, [filteredStudents]);

  /* ── summary stats ── */
  const stats = useMemo(() => ({
    total: students.length,
    admitted: students.filter((s) => s.isAdmitted).length,
    pending: students.filter((s) => !s.isAdmitted).length,
  }), [students]);

  /* ── modal ── */
  const openModal = useCallback((row: AdmittedStudent) => {
    setSelectedStudent(row);
    setRemark("");
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedStudent(null);
    setRemark("");
  }, []);

  /* ── admit / reject ── */
  const handleAction = async (action: "admit" | "reject") => {
    if (!selectedStudent) return;
    try {
      setActionLoading(action);

      if (action === "admit") {
        const result = await admitStudent({
          applicationId: selectedStudent.applicationId,
          applicationNo: selectedStudent.appNo,
          name: selectedStudent.name,
          remarks: remark || undefined,
        });

        // Re-fetch course detail for this specific application after update.
        // Multi-preference applications return one row per preference here —
        // always take the one actually accepted, not just the first row.
        const updatedCourseDetails = await getCourseDetailsByApplicationId(selectedStudent.applicationId);
        const cd = pickAcceptedCourseDetail(updatedCourseDetails);

        setStudents((prev) =>
          prev.map((s) => {
            if (s.verificationId !== selectedStudent.verificationId) return s;
            return {
              ...s,
              isAdmitted: true,
              admittedStudentId: result.id,
              // patch course/degree from the refreshed record if available
              ...(cd
                ? {
                  degreeId: cd.degreeId,
                  courseId: cd.courseId,
                  degreeTypeId: degreeToDegreeTypeIdRef.current.get(cd.degreeId) ?? s.degreeTypeId,
                }
                : {}),
            };
          })
        );
        showToast("Student admitted successfully.", "success");
      } else {
        await updateApplicationVerification({
          id: selectedStudent.verificationId,
          applicationId: selectedStudent.applicationId,
          appNo: selectedStudent.appNo,
          verificationStatus: "Rejected",
          remark: remark || undefined,
        });

        // Same gap as document-verification.tsx's handleVerify had: an
        // AdmittedStudent record's admitYn stays true forever unless
        // something explicitly flips it. Rejecting a student who was
        // already admitted must revoke that record too, or "presence in
        // the table" (the sole signal both pages use for the Admitted
        // badge) stays stale and they keep showing as Admitted elsewhere.
        if (selectedStudent.isAdmitted && selectedStudent.admittedStudentId) {
          try {
            await updateAdmittedStudent({ id: selectedStudent.admittedStudentId, admitYn: false });
          } catch {
            // Non-fatal — the rejection itself already saved above.
          }
        }

        // Re-fetch course detail for this application after rejection update
        await getCourseDetailsByApplicationId(selectedStudent.applicationId);

        setStudents((prev) =>
          prev.filter((s) => s.verificationId !== selectedStudent.verificationId)
        );
        showToast("Application rejected.", "error");
      }
      closeModal();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      showToast(e?.response?.data?.message ?? e?.message ?? "Action failed.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const hasActiveFilter = !!searchQuery || Object.values(filters).some((f) => f.length > 0);
  const filterSections = [
    { title: "Degree", key: "degree", options: degreeOptions },
    { title: "Course", key: "course", options: courseOptions },
  ];

  /* ── render ── */
  return (
    <AppLayout pageTitle="Admit Students">
      {toast && (
        <div className="fixed z-50 top-5 right-5">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}

      <div data-testid="admit-students-page" className="pb-8 space-y-5" style={{ zoom: 0.92 }}>

        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl text-text">Admit Students</h1>
          <p className="mt-1 text-sm text-slate-500">
            Students whose verification is{" "}
            <span className="font-semibold text-emerald-600">Accepted</span> — review and admit or reject.
          </p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard
            icon={<Users size={18} className="text-primary" />}
            accent="bg-primary/10"
            label="Total Accepted"
            value={loading ? "—" : stats.total}
          />
          <SummaryCard
            icon={<UserCheck size={18} className="text-blue-600" />}
            accent="bg-blue-100"
            label="Admitted"
            value={loading ? "—" : stats.admitted}
          />
          <SummaryCard
            icon={<GraduationCap size={18} className="text-amber-600" />}
            accent="bg-amber-100"
            label="Pending Admission"
            value={loading ? "—" : stats.pending}
          />
        </div>

        {/* SEARCH + FILTER */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="flex flex-col items-end gap-3 sm:flex-row">
            <div className="relative flex-1 min-w-0">
              <Search size={13} className="absolute -translate-y-1/2 pointer-events-none left-3 top-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or application number…"
                className="w-full py-2 pl-8 pr-8 text-sm transition-all bg-white border rounded-lg border-slate-200 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
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
              <Button
                variant="outline"
                onClick={() => { setSearchQuery(""); setFilters({ degree: [], course: [] }); }}
              >
                Clear
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            {loading
              ? "Loading…"
              : `${filteredStudents.length} student${filteredStudents.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* GROUPED VIEW */}
        {loading ? (
          <div className="flex items-center justify-center h-40 bg-white border border-slate-200 rounded-xl">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <span className="w-8 h-8 border-2 rounded-full border-primary/30 border-t-primary animate-spin" />
              <span className="text-sm">Loading students…</span>
            </div>
          </div>
        ) : groupedByDegreeType.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-16 text-center bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-center rounded-full w-14 h-14 bg-slate-100 text-slate-300">
              <Search size={24} />
            </div>
            <p className="font-semibold text-slate-600">No students found</p>
            <p className="text-sm text-slate-400">
              {hasActiveFilter ? "Try adjusting your search or filters." : "No applications have been accepted yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden bg-white border border-slate-200 rounded-xl">
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

            {/* ── Degree Type tabs ── */}
            <div className="flex gap-1 px-2 overflow-x-auto overflow-y-hidden border-b bg-slate-50/60">
              {groupedByDegreeType.map(({ degreeTypeId, byDegree }) => {
                const typeStudentCount = byDegree.reduce((sum, d) => sum + d.students.length, 0);
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
                      {typeStudentCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── Degree → Course accordion for the selected tab ── */}
            {(() => {
              const activeGroup = groupedByDegreeType.find((g) => g.degreeTypeId === activeDegreeTypeTab);
              if (!activeGroup) return null; // settles on the next render via the default-tab effect
              const { degreeTypeId, byDegree } = activeGroup;
              return (
                <div className="p-4 space-y-2 bg-slate-50/60">
                  {byDegree.map((degreeGroup) => {
                    const dgKey = `dg:${degreeTypeId}::${degreeGroup.degreeId}`;
                    return (
                      <DegreeAccordion
                        key={dgKey}
                        group={degreeGroup}
                        isOpen={expandedGroups.has(dgKey)}
                        onToggle={() => toggleGroup(dgKey)}
                        expandedCourseKeys={expandedGroups}
                        onToggleCourse={toggleGroup}
                        onView={openModal}
                        yearColorMap={yearColorMap}
                        degreeTypeId={degreeTypeId}
                      />
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ADMIT / REJECT MODAL */}
      <Modal open={modalOpen} title="Student Details" onClose={closeModal} size="lg">
        {selectedStudent && (
          <div className="space-y-5">

            {/* Info grid */}
            <div className="grid grid-cols-1 gap-5 pb-5 border-b sm:grid-cols-2 border-slate-100">
              <div>
                <p className="mb-3 text-xs font-semibold tracking-widest uppercase text-slate-400">Student</p>
                <div className="space-y-2.5">
                  {([
                    ["App No.", selectedStudent.appNo],
                    ["Name", selectedStudent.name],
                    ["Phone", selectedStudent.phone],
                    ["Email", selectedStudent.email],
                    ["Category", selectedStudent.categoryName],
                  ] as [string, string][]).filter(([, v]) => v && v !== "-").map(([label, value]) => (
                    <div key={label} className="flex gap-2">
                      <span className="text-xs text-slate-400 w-20 shrink-0 pt-0.5">{label}</span>
                      <span className="text-sm font-semibold text-text">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold tracking-widest uppercase text-slate-400">Course &amp; Status</p>
                <div className="space-y-2.5">
                  {([
                    ["Degree", selectedStudent.degreeName],
                    ["Course", selectedStudent.courseName],
                    ["Installment", selectedStudent.installment?.toString()],
                    ["Acad. Year", selectedStudent.academicYearDesc ?? undefined],
                    ["Batch Year", selectedStudent.batchYear ?? undefined],
                  ] as [string, string | undefined][]).filter(([, v]) => v && v !== "-").map(([label, value]) => (
                    <div key={label} className="flex gap-2">
                      <span className="text-xs text-slate-400 w-20 shrink-0 pt-0.5">{label}</span>
                      <span className="text-sm font-semibold text-text">{value}</span>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <span className="text-xs text-slate-400 w-20 shrink-0 pt-0.5">Status</span>
                    <StatusBadge isAdmitted={selectedStudent.isAdmitted} />
                  </div>
                </div>
              </div>
            </div>

            {/* Remark */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Remark <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                placeholder="Add a remark for this admission decision…"
                className="w-full px-3 py-2 text-sm transition-all border resize-none rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse justify-end gap-2 pt-2 border-t sm:flex-row border-slate-100">
              <Button variant="outline" onClick={closeModal}>
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAction("reject")}
                disabled={actionLoading !== null}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle size={15} />
                {actionLoading === "reject" ? "Rejecting…" : "Reject"}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleAction("admit")}
                disabled={actionLoading !== null || selectedStudent.isAdmitted}
              >
                <CheckCircle size={15} />
                {selectedStudent.isAdmitted
                  ? "Already Admitted"
                  : actionLoading === "admit"
                    ? "Admitting…"
                    : "Admit"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}