import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Search, FileText, Download, FolderOpen, X, ChevronDown, ChevronRight, BookOpen, FileUserIcon } from "lucide-react";
import Input from "../../components/ui/Input";
import FilterPanel from "../../components/ui/FilterPanel";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Checkbox from "../../components/ui/Checkbox";
import Modal from "../../components/ui/Modal";
import Textarea from "../../components/ui/Textarea";
import Loader from "../../components/ui/Loader";
import AppLayout from "../../components/layouts/AppLayout";
import Toast from "../../components/ui/Toast";
import { getLookupsByType } from "../../services/lookupService";
import { getDegrees } from "../../services/degreeService";
import type { Degree } from "../../services/degreeService";
import { getCourses } from "../../services/courseService";
import type { Course } from "../../services/courseService";
import { getLoginByUsername } from "../../services/loginService";
import { getRegistrationByUsername } from "../../services/registrationService";
import { getDocumentCoordinators, isCoordinatorMappingActive } from "../../services/documentCoordinatorService";
import {
  getDocumentVerificationList,
  getFullApplicationByAppNo,
  type DocumentVerificationListItemDto,
  type ApplicationDocument,
  type FeeCollectionResponse,
  type FeeCollectionManualResponse,
} from "../../services/applicationQueryService";
import { previewApplicationPdfAdmin } from "../../services/reportService";
import { openDocumentFile, downloadDocumentFile } from "../../services/documentService";
import {
  createApplicationVerification,
  updateApplicationVerification,
  type ApplicationVerification,
} from "../../services/applicationVerificationService";
import { getFeeByFilters, type AdmissionFeeStructure } from "../../services/admissionFeeStructureService";
import { getAcademicYears } from "../../services/academicYearService";
import { acceptCourseDetailPreference } from "../../services/applicationCourseDetailService";
// "Admitted" is a separate downstream step from "Accepted" — a student is only
// truly admitted once admitStudent() has run (manually or auto-admitted on fee
// payment) and produced an AdmittedStudent record. Same source of truth
// admit-students.tsx uses for its own admitted/pending counts.
import { getAdmittedStudents } from "../../services/admitStudentService";

/* ─── Types ───────────────────────────────────────────────────────────────── */

type CourseDetailItem = {
  id: string;
  degreeId: string;
  courseId: string;
  batchId?: string | null;
  previousRegistrationNo?: string | null;
  preference?: string | null;
  acceptedYn?: boolean | null;
};

const preferenceRank = (pref?: string | null): number => {
  if (!pref) return 0;
  const n = parseInt(String(pref).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

type PreferenceRow = {
  id: string;
  degreeId: string;
  courseId: string;
  preference: number;
  degree: string;
  course: string;
  acceptedYn: boolean;
};

type Row = {
  id: string;
  applicationNumber: string;
  studentName: string;
  degree: string;
  course: string;
  quota: string;
  documentStatus: "pending" | "verified" | "rejected";
  // Per-preference "this is the course the student was actually admitted to"
  // flag. For single-preference applications this just mirrors
  // documentStatus === "verified"; for multi-preference applications only
  // ONE preference row carries acceptedYn === true once the application is
  // Accepted (set via acceptCourseDetailPreference).
  acceptedYn: boolean;
  email: string;
  phone: string;
  address: string;
  degreeId: string;
  degreeTypeId: string;
  degreeType2: string | null;
  courseId: string;
  categoryId: string;
  documents: ApplicationDocument[];
  feePayments: FeeCollectionResponse[];
  feeStructure: AdmissionFeeStructure | null;
  verification: ApplicationVerification | null;
  previousRegistrationNo: string | null;
  batchId: string | null;
  batchYear: string | null;
  preferences: PreferenceRow[];
  preferenceCount: number;
  isAppFeePaid: boolean;
  isAdmissionFeePaid: boolean;
  // True for existing students (previousRegistrationNo) applying to Bachelor
  // of Science in AY 2023-2024 — same rule as application_fee.tsx. These
  // students never get a fee payment record (nothing to pay), so
  // isAppFeePaid alone would wrongly exclude them from the list below.
  isFeeExempt: boolean;
  // True only once an AdmittedStudent record exists with admitYn === true —
  // NOT the same as documentStatus === "verified" (Accepted). Accepted just
  // means verification passed; Admitted is the separate step that happens on
  // admit-students.tsx (manually or auto-admitted after fee payment).
  isAdmitted: boolean;
};

type DisplayRow = Row & { displayPreferenceRank?: number };

type VerificationOption = { id: string; name: string };

const FEE_ENABLED_DEGREE_TYPE2 = new Set(["CertificateCourse", "PG"]);

// Fee exemption rule (must match application_fee.tsx and layoutConfig.ts):
// existing student (previousRegistrationNo) + Bachelor of Science + AY 2023-2024.
const FEE_EXEMPT_ACADEMIC_YEAR = "2023-2024";
const isBScDegreeName = (name?: string | null) =>
  (name ?? "").trim().toLowerCase() === "bachelor of science";

/* ─── Constants ───────────────────────────────────────────────────────────── */

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  verified: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

const NAME_TO_STATUS: Record<string, Row["documentStatus"]> = {
  "Accepted": "verified",
  "Rejected": "rejected",
  "Pending/On Hold": "pending",
};

function resolveStatus(raw: string | null | undefined): Row["documentStatus"] {
  if (!raw) return "pending";
  const trimmed = raw.trim();
  if (NAME_TO_STATUS[trimmed]) return NAME_TO_STATUS[trimmed];
  const lower = trimmed.toLowerCase();
  if (lower === "accepted") return "verified";
  if (lower === "rejected") return "rejected";
  return "pending";
}

const BUTTON_STYLE: Record<string, string> = {
  "Accepted": "border-emerald-400 text-emerald-700 hover:bg-emerald-50",
  "Rejected": "border-red-400    text-red-600    hover:bg-red-50",
  "Pending/On Hold": "border-amber-400  text-amber-700  hover:bg-amber-50",
};

const FEE_BADGE: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100  text-amber-700",
  failed: "bg-red-100    text-red-700",
};

const REMARK_REQUIRED = new Set(["Rejected", "Pending/On Hold"]);

// Queue order: pending first (needs attention), verified next, rejected last.
const DOCUMENT_STATUS_RANK: Record<Row["documentStatus"], number> = {
  pending: 0,
  verified: 1,
  rejected: 2,
};

// Post-payment "Edit Access" auto-expires 24hrs after enabling, tracked via
// the verification record's own updateOn (no dedicated field yet — see
// editAccessUpdatedAt below for the fallback field names).
const EDIT_ACCESS_TTL_MS = 24 * 60 * 60 * 1000;

function editAccessUpdatedAt(verif: ApplicationVerification | null | undefined): string | undefined {
  // Cast/guessing candidates until the real audit field name is confirmed —
  // same caveat as insertBy/updateBy above.
  return (verif as any)?.updateOn ?? (verif as any)?.verificationUpdateOn ?? (verif as any)?.updatedOn ?? undefined;
}

function isEditAccessActive(verif: ApplicationVerification | null | undefined): boolean {
  if (!verif?.postPaymentEdit) return false;
  const updatedAt = editAccessUpdatedAt(verif);
  if (!updatedAt) return true; // no audit timestamp available — don't lock out existing data
  return Date.now() - new Date(updatedAt).getTime() < EDIT_ACCESS_TTL_MS;
}

function editAccessRemainingLabel(verif: ApplicationVerification | null | undefined): string | null {
  const updatedAt = editAccessUpdatedAt(verif);
  if (!updatedAt || !verif?.postPaymentEdit) return null;
  const msLeft = EDIT_ACCESS_TTL_MS - (Date.now() - new Date(updatedAt).getTime());
  if (msLeft <= 0) return null;
  const hrsLeft = Math.max(1, Math.round(msLeft / (60 * 60 * 1000)));
  return `Auto-locks in ~${hrsLeft} hr${hrsLeft === 1 ? "" : "s"}`;
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function DocumentVerificationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({
    degree: [], course: [], category: [], status: [], year: [],
  });

  const [rows, setRows] = useState<Row[]>([]);
  // Starts true: data fetching begins immediately on mount, so this avoids a
  // flash of "No applications found" before the fetch is even underway.
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  /* Verification */
  const [verificationOptions, setVerificationOptions] = useState<VerificationOption[]>([]);
  const [existingVerification, setExistingVerification] = useState<ApplicationVerification | null>(null);
  const [remark, setRemark] = useState("");
  const [remarkError, setRemarkError] = useState("");
  const [saving, setSaving] = useState(false);
  const [approvingInstallment, setApprovingInstallment] = useState(false);
  const [removingInstallment, setRemovingInstallment] = useState(false);
  const [enablingFees, setEnablingFees] = useState(false);
  const [togglingPostPaymentEditId, setTogglingPostPaymentEditId] = useState<string | null>(null);

  /* Bulk fee enable */
  const [feeBulkMode, setFeeBulkMode] = useState(false);
  const [selectedFeeIds, setSelectedFeeIds] = useState<Set<string>>(new Set());
  const [bulkEnablingFees, setBulkEnablingFees] = useState(false);
  // Snapshot of the status filter from just before bulk mode auto-applies
  // "Accepted", so exiting restores it instead of leaving "Accepted" stuck.
  const statusFilterBeforeBulkMode = useRef<string[]>([]);

  const [modalDocs, setModalDocs] = useState<ApplicationDocument[]>([]);
  const [feeStructure, setFeeStructure] = useState<AdmissionFeeStructure | null>(null);
  const [feePayments, setFeePayments] = useState<FeeCollectionResponse[]>([]);
  const [manualFeePayments, setManualFeePayments] = useState<FeeCollectionManualResponse[]>([]);
  const [prevRegNo, setPrevRegNo] = useState<string | null>(null);
  const [academicYearDesc, setAcademicYearDesc] = useState<string | null>(null);
  const [batchYear, setBatchYear] = useState<string | null>(null);
  // The batch's own academic-year description (e.g. "2023-2024") — distinct
  // from `batchYear` above, which holds the short display label, not the
  // description string the fee-exemption rule compares against.
  const [batchAcademicYearDesc, setBatchAcademicYearDesc] = useState<string | null>(null);

  const [coursePreferences, setCoursePreferences] = useState<PreferenceRow[]>([]);
  // Application Fee is paid per course (matched via courseId, same as
  // Admission Fee) — coursePreferences only holds courses that are paid or
  // exempt, for the accept-preference selector. allCoursePreferences is the
  // full unfiltered list, needed for course-label lookups and fee scoping
  // regardless of payment status.
  const [allCoursePreferences, setAllCoursePreferences] = useState<PreferenceRow[]>([]);
  const [selectedPreferenceId, setSelectedPreferenceId] = useState<string | null>(null);

  const [academicYears, setAcademicYears] = useState<Awaited<ReturnType<typeof getAcademicYears>>>([]);

  /* Toast */
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* ── Lookup maps ── */
  const [degreeMap, setDegreeMap] = useState<Record<string, string>>({});
  const [courseMap, setCourseMap] = useState<Record<string, string>>({});
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});

  const degreeMapRef = useRef(degreeMap);
  const courseMapRef = useRef(courseMap);
  const categoryMapRef = useRef(categoryMap);
  useEffect(() => { degreeMapRef.current = degreeMap; }, [degreeMap]);
  useEffect(() => { courseMapRef.current = courseMap; }, [courseMap]);
  useEffect(() => { categoryMapRef.current = categoryMap; }, [categoryMap]);

  const degreeType2MapRef = useRef<Record<string, string | null>>({});

  const batchYearMapRef = useRef<Record<string, string | null>>({});

  // academicYearId -> description (e.g. "2023-2024"), for the isFeeExempt
  // check in mapItem below. Kept in sync with the academicYears list fetch.
  const academicYearMapRef = useRef<Record<string, string>>({});

  // applicationId -> admitYn, from AdmittedStudent records (getAdmittedStudents).
  // Refreshed alongside rows in fetchData. Distinct from isAppFeePaid/isAdmissionFeePaid —
  // this reflects the actual admission decision, not fee payment or verification status.
  const admittedByAppIdRef = useRef<Record<string, boolean>>({});

  const degreeToDegreeTypeIdRef = useRef<Record<string, string>>({});
  const [degreeTypeNameMap, setDegreeTypeNameMap] = useState<Record<string, string>>({});
  const degreeTypeNameMapRef = useRef<Record<string, string>>({});
  useEffect(() => { degreeTypeNameMapRef.current = degreeTypeNameMap; }, [degreeTypeNameMap]);
  const [degreesData, setDegreesData] = useState<Degree[]>([]);
  const [coursesData, setCoursesData] = useState<Course[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [statusOptions, setStatusOptions] = useState<{ label: string; value: string }[]>([]);

  const [assignedPairs, setAssignedPairs] = useState<{ degreeId: string; courseId: string }[] | null>(null);
  const [isDocumentAdmin, setIsDocumentAdmin] = useState(false);

  // "Verified By" on the verification record only stores the acting user's
  // username (insertBy/updateBy). Resolve those usernames to display names
  // via the registration record (registration.name), same source registration.tsx
  // uses to show a person's name. Cached by username so we only fetch once
  // per user, even as rows refresh after save/approve/etc.
  const [verifierNameMap, setVerifierNameMap] = useState<Record<string, string>>({});
  const verifierNameMapRef = useRef<Record<string, string>>({});
  useEffect(() => { verifierNameMapRef.current = verifierNameMap; }, [verifierNameMap]);

  useEffect(() => {
    const usernames = Array.from(
      new Set(
        rows
          .map((r) => r.verification?.updateBy || r.verification?.insertBy)
          .filter((u): u is string => !!u && !verifierNameMapRef.current[u])
      )
    );
    if (usernames.length === 0) return;

    let cancelled = false;
    Promise.all(
      usernames.map(async (u) => {
        try {
          const reg = await getRegistrationByUsername(u);
          return [u, reg?.name || u] as const;
        } catch {
          // No matching registration (or lookup failed) — fall back to
          // showing the raw username rather than blocking the column.
          return [u, u] as const;
        }
      })
    ).then((pairs) => {
      if (cancelled) return;
      setVerifierNameMap((prev) => {
        const next = { ...prev };
        for (const [u, name] of pairs) next[u] = name;
        return next;
      });
    });

    return () => { cancelled = true; };
  }, [rows]);

  const resolveVerifierName = useCallback(
    (username?: string | null) => (username ? (verifierNameMap[username] ?? username) : undefined),
    [verifierNameMap]
  );

  const mapItem = useCallback((item: DocumentVerificationListItemDto): Row => {
    const verif: ApplicationVerification | null = item.verificationId
      ? ({
        id: item.verificationId,
        applicationId: item.id,
        appNo: item.appNo,
        verificationStatus: item.verificationStatus ?? undefined,
        remark: item.verificationRemark ?? undefined,
        installment: item.installment ?? undefined,
        feesEnabled: item.feesEnabled ?? undefined,
        // Cast until postPaymentEdit is added to DocumentVerificationListItemDto server-side.
        postPaymentEdit: (item as any).postPaymentEdit ?? undefined,
        // TODO: confirm the real property names once DocumentVerificationListItemDto
        // is shared — guessing common candidates so the grid isn't silently blank.
        updateBy: (item as any).verificationUpdateBy ?? (item as any).updateBy ?? undefined,
        insertBy: (item as any).verificationInsertBy ?? (item as any).insertBy ?? undefined,
        // Audit "last updated" timestamp — reused to drive the 24 hr edit-access
        // auto-lock instead of a dedicated field. Cast for the same reason.
        updateOn: (item as any).verificationUpdateOn ?? (item as any).updateOn ?? (item as any).updatedOn ?? undefined,
      } as ApplicationVerification)
      : null;

    const preferences: PreferenceRow[] = [{
      id: "",
      degreeId: item.degreeId ?? "",
      courseId: item.courseId ?? "",
      preference: 1,
      degree: item.degreeId ? (degreeMapRef.current[item.degreeId] ?? "—") : "—",
      course: item.courseId ? (courseMapRef.current[item.courseId] ?? "—") : "—",
      acceptedYn: false,
    }];

    return {
      id: item.id,
      applicationNumber: item.appNo,
      studentName: item.name ?? "—",
      degree: item.degreeId ? (degreeMapRef.current[item.degreeId] ?? "—") : "—",
      course: item.courseId ? (courseMapRef.current[item.courseId] ?? "—") : "—",
      quota: categoryMapRef.current[item.categoryId ?? ""] ?? "—",
      documentStatus: resolveStatus(verif?.verificationStatus),
      // Single-preference application: nothing to disambiguate, so treat as
      // admitted once verified. Multi-preference apps get their real
      // per-course acceptedYn filled in later, in expandedRows.
      acceptedYn: resolveStatus(verif?.verificationStatus) === "verified",
      email: item.email ?? "—",
      phone: item.phone ?? "—",
      address: item.permanentAddress ?? "—",
      degreeId: item.degreeId ?? "",
      degreeTypeId: item.degreeId ? (degreeToDegreeTypeIdRef.current[item.degreeId] ?? "") : "",
      degreeType2: item.degreeId ? (degreeType2MapRef.current[item.degreeId] ?? null) : null,
      courseId: item.courseId ?? "",
      categoryId: item.categoryId ?? "",
      documents: [],
      feePayments: [],
      feeStructure: null,
      verification: verif,
      previousRegistrationNo: item.previousRegistrationNo ?? null,
      batchId: item.batchId ?? null,
      batchYear: item.batchId ? (batchYearMapRef.current[item.batchId] ?? null) : null,
      preferences,
      preferenceCount: (item as unknown as { preferenceCount?: number }).preferenceCount ?? preferences.length,
      isAppFeePaid: !!item.isAppFeePaid,
      // Drives whether the Edit Access button is live.
      isAdmissionFeePaid: !!item.isAdmissionFeePaid,
      // Same exemption rule as the modal's isFeeExempt (and application_fee.tsx):
      // existing student + Bachelor of Science + BATCH year 2023-2024. Checked
      // against batchId, not academicYearId — the application's academicYearId
      // is always the year they're applying in now, not their original batch.
      isFeeExempt:
        !!item.previousRegistrationNo &&
        isBScDegreeName(item.degreeId ? degreeMapRef.current[item.degreeId] : null) &&
        academicYearMapRef.current[item.batchId ?? ""] === FEE_EXEMPT_ACADEMIC_YEAR,
      // Only trust an AdmittedStudent record if the application is actually
      // verified/Accepted — otherwise a pending application whose record
      // exists for some other reason (e.g. auto-admit fired, then
      // verification got reset) would still show "Admitted". Multi-
      // preference rows get a further per-course gate below (p.acceptedYn),
      // but that only ever narrows this — it can't turn a false back to true.
      isAdmitted:
        resolveStatus(verif?.verificationStatus) === "verified" &&
        admittedByAppIdRef.current[item.id] === true,
    };
  }, []);

  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const [results, admittedList] = await Promise.all([
        getDocumentVerificationList(),
        getAdmittedStudents().catch(() => []), // non-fatal — admitted badge/count just falls back to false
      ]);

      if (requestId !== requestIdRef.current) return; // a newer search superseded this one

      admittedByAppIdRef.current = Object.fromEntries(
        admittedList.map((a) => [a.applicationId, a.admitYn === true])
      );

      setRows(results.map(mapItem));
    } catch {
      if (requestId === requestIdRef.current) {
        showToast("Failed to load applications.", "error");
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [mapItem, showToast]);

  const preferenceExpansionsRef = useRef<Record<string, PreferenceRow[]>>({});
  // Admission Fee (unlike Application Fee) is specific to one degree+course —
  // its structure is even looked up via getFeeByFilters(degreeId, courseId, ...).
  // So for a student who applied under multiple preferences, "paid" only
  // applies to the specific course the payment/receipt was recorded against,
  // not to every preference row. These track which courseIds actually have a
  // successful payment, per application, per fee type. Application Fee gates
  // which preferences even show up in document verification (verification
  // happens at apply-time, before any admission decision); Admission Fee
  // paid status is a separate, later-stage flag used for its own badge/
  // eligibility logic elsewhere on this page.
  const applicationFeePaidCourseIdsRef = useRef<Record<string, Set<string>>>({});
  const admissionFeePaidCourseIdsRef = useRef<Record<string, Set<string>>>({});
  const expandingAppsRef = useRef<Set<string>>(new Set());
  const [preferenceExpansionsTick, setPreferenceExpansionsTick] = useState(0);

  useEffect(() => {
    const toFetch = rows.filter(
      (r) =>
        r.preferenceCount > 1 &&
        !preferenceExpansionsRef.current[r.applicationNumber] &&
        !expandingAppsRef.current.has(r.applicationNumber)
    );
    if (toFetch.length === 0) return;
    toFetch.forEach((r) => expandingAppsRef.current.add(r.applicationNumber));

    (async () => {
      const settled = await Promise.allSettled(
        toFetch.map(async (r) => {
          const full = await getFullApplicationByAppNo(r.applicationNumber);
          const courseDetails = (full.courseDetails ?? []) as CourseDetailItem[];
          const ranked = [...courseDetails].sort(
            (a, b) => preferenceRank(a.preference) - preferenceRank(b.preference)
          );
          const prefs: PreferenceRow[] = ranked.map((d, i) => ({
            id: d.id,
            degreeId: d.degreeId ?? "",
            courseId: d.courseId ?? "",
            preference: preferenceRank(d.preference) || i + 1,
            degree: d.degreeId ? (degreeMapRef.current[d.degreeId] ?? "—") : "—",
            course: d.courseId ? (courseMapRef.current[d.courseId] ?? "—") : "—",
            acceptedYn: !!d.acceptedYn,
          }));

          // Same call already returns feePayments (online) and
          // manualFeePayments (Receipt Entry) — pull out which courseId(s)
          // have an actual successful payment against them, separately for
          // each fee type. Both online and manual records carry a real
          // courseId now.
          const allFees = (full.feePayments ?? []) as FeeCollectionResponse[];
          const allManualFees = (full.manualFeePayments ?? []) as FeeCollectionManualResponse[];
          const applicationFeePaidCourseIds = new Set<string>();
          const admissionFeePaidCourseIds = new Set<string>();
          allFees
            .filter((f) => (f.status ?? "").toUpperCase() === "SUCCESS")
            .forEach((f) => {
              if (!f.courseId) return;
              const type = (f.feeType ?? "").toLowerCase();
              if (type.includes("application fee")) applicationFeePaidCourseIds.add(f.courseId);
              if (type.includes("admission fee")) admissionFeePaidCourseIds.add(f.courseId);
            });
          allManualFees.forEach((f) => {
            if (!f.courseId) return;
            const name = (f.feeName ?? "").toLowerCase();
            if (name.includes("application fee")) applicationFeePaidCourseIds.add(f.courseId);
            if (name.includes("admission fee")) admissionFeePaidCourseIds.add(f.courseId);
          });

          return { appNo: r.applicationNumber, prefs, applicationFeePaidCourseIds, admissionFeePaidCourseIds };
        })
      );
      let didUpdate = false;
      for (const s of settled) {
        if (s.status === "fulfilled" && s.value.prefs.length > 0) {
          preferenceExpansionsRef.current[s.value.appNo] = s.value.prefs;
          applicationFeePaidCourseIdsRef.current[s.value.appNo] = s.value.applicationFeePaidCourseIds;
          admissionFeePaidCourseIdsRef.current[s.value.appNo] = s.value.admissionFeePaidCourseIds;
          didUpdate = true;
        }
      }
      if (didUpdate) setPreferenceExpansionsTick((v) => v + 1);
    })();
  }, [rows]);

  const expandedRows = useMemo<DisplayRow[]>(() => {
    const out: DisplayRow[] = [];
    for (const r of rows) {
      const prefs = r.preferenceCount > 1 ? preferenceExpansionsRef.current[r.applicationNumber] : undefined;
      if (prefs && prefs.length > 0) {
        // Available in the same fetch that produced `prefs`, so both are
        // guaranteed to be set whenever `prefs` is.
        const paidAppFeeCourseIds = applicationFeePaidCourseIdsRef.current[r.applicationNumber] ?? new Set<string>();
        const paidAdmissionFeeCourseIds = admissionFeePaidCourseIdsRef.current[r.applicationNumber] ?? new Set<string>();
        // Only show preferences whose Application Fee has actually been
        // paid — unpaid preferences were never taken up, so they don't
        // belong in a document-verification queue at all.
        for (const p of prefs) {
          if (!(p.courseId && paidAppFeeCourseIds.has(p.courseId))) continue;
          out.push({
            ...r,
            degreeId: p.degreeId || r.degreeId,
            courseId: p.courseId || r.courseId,
            degree: p.degree,
            course: p.course,
            degreeTypeId: p.degreeId ? (degreeToDegreeTypeIdRef.current[p.degreeId] ?? r.degreeTypeId) : r.degreeTypeId,
            displayPreferenceRank: p.preference,
            acceptedYn: p.acceptedYn,
            // documentStatus (from the single, application-level verification
            // record) was previously copied unchanged onto every preference
            // row — so once ANY course got Accepted, every other preference
            // row also showed the "Verified"/"Accepted" badge. acceptCourseDetailPreference
            // is what actually records which course_detail was accepted
            // (p.acceptedYn) — so only that specific row keeps the real
            // status; the rest fall back to "pending" since no decision has
            // been recorded against their course.
            documentStatus: p.acceptedYn ? r.documentStatus : (r.documentStatus === "verified" ? "pending" : r.documentStatus),
            // Was previously copied unchanged from the application-level
            // flag for every preference row — meaning a student who paid
            // for ONE accepted course showed as "paid" against every
            // course they'd applied to. Now scoped to whichever course
            // actually has an Admission Fee payment recorded against it.
            isAdmissionFeePaid: p.courseId ? paidAdmissionFeeCourseIds.has(p.courseId) : r.isAdmissionFeePaid,
            // Same bug, same fix: isAdmitted was copied unchanged from the
            // application-level flag onto every preference row, so a student
            // admitted into course A also showed "admitted" against every
            // other course they'd merely listed as a preference. Only the
            // preference actually accepted (p.acceptedYn) can carry it.
            isAdmitted: p.acceptedYn ? r.isAdmitted : false,
          });
        }
      } else {
        out.push(r);
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, preferenceExpansionsTick]);

  useEffect(() => {
    Promise.all([
      getDegrees(),
      getCourses(),
      getLookupsByType("Category"),
      getLookupsByType("Verification"),
      getLookupsByType("DegreeType"),
      getAcademicYears(),
    ]).then(([degrees, courses, categories, statuses, degreeTypes, years]) => {
      const dMap = Object.fromEntries(degrees.map((d) => [d.id, d.degreeName]));
      const cMap = Object.fromEntries(courses.map((c) => [c.id, c.name]));
      const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name ?? ""]));

      // DegreeType lookup id -> type2 (e.g. "UG" / "PG" / "CertificateCourse")
      const degreeTypeIdToType2 = Object.fromEntries(
        degreeTypes.map((dt) => [dt.id, dt.type2 ?? ""])
      );
      // Degree.id -> type2, via Degree.degreeTypeId
      const degreeType2Map = Object.fromEntries(
        degrees.map((d) => [d.id, d.degreeTypeId ? (degreeTypeIdToType2[d.degreeTypeId] ?? null) : null])
      );
      // Degree.id -> degreeTypeId (raw lookup id) and degreeTypeId -> display name —
      // used to group the table by Degree Type.
      const degreeToDegreeTypeId = Object.fromEntries(
        degrees.map((d) => [d.id, d.degreeTypeId ?? ""])
      );
      const degreeTypeIdToName = Object.fromEntries(
        degreeTypes.map((dt) => [dt.id, dt.name ?? dt.type2 ?? "—"])
      );

      degreeMapRef.current = dMap;
      courseMapRef.current = cMap;
      categoryMapRef.current = catMap;
      degreeType2MapRef.current = degreeType2Map;
      degreeToDegreeTypeIdRef.current = degreeToDegreeTypeId;
      degreeTypeNameMapRef.current = degreeTypeIdToName;
      setDegreeTypeNameMap(degreeTypeIdToName);

      // Academic Year id -> batchYear label, used to resolve each row's batchId.
      batchYearMapRef.current = Object.fromEntries(
        years.map((y) => [y.id, y.batchYear ?? null])
      );
      academicYearMapRef.current = Object.fromEntries(
        years.map((y) => [y.id, (y.description ?? "").trim()])
      );

      setAcademicYears(years);
      setDegreeMap(dMap);
      setCourseMap(cMap);
      setCategoryMap(catMap);
      setDegreesData(degrees);
      setCoursesData(courses);
      setCategoryOptions(categories.map((c) => ({ label: c.name ?? "", value: c.id })));
      setStatusOptions(statuses.map((s) => ({ label: s.name ?? "", value: s.name ?? "" })));
      setVerificationOptions(statuses.filter((s) => s.name).map((s) => ({ id: s.id, name: s.name! })));

      fetchData(); // load all applications immediately — no Search click needed
    }).catch((err) => {
      console.error(err);
      setLoading(false);
      showToast("Failed to load lookup data. Please refresh the page.", "error");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live-track admission fee status so the "Edit Access" button unlocks itself
  // the moment a student's admission fee payment succeeds — no manual refresh
  // needed. Runs quietly in the background: it only patches isAdmissionFeePaid
  // onto rows already loaded, so it never resets filters, the open modal, or
  // bulk-selection state, and never triggers the full-page loading spinner.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const results = await getDocumentVerificationList();
        const feeStatusById = new Map(
          results.map((item) => [item.id, !!item.isAdmissionFeePaid])
        );
        setRows((prev) =>
          prev.map((r) =>
            feeStatusById.has(r.id)
              ? { ...r, isAdmissionFeePaid: feeStatusById.get(r.id)! }
              : r
          )
        );
      } catch {
        // Silent — a missed background poll shouldn't interrupt the admin's session.
      }
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    if (!username) return;

    Promise.all([
      getLoginByUsername(username),
      getLookupsByType("Role"),
    ]).then(async ([loginData, roles]) => {
      const roleName = roles.find((r) => r.id === loginData.roleId)?.name ?? "";
      if (roleName.toLowerCase() !== "document-admin") return;

      setIsDocumentAdmin(true);

      try {
        const mappings = await getDocumentCoordinators();
        const mine = mappings.filter((m) => m.username === username && isCoordinatorMappingActive(m.status));
        setAssignedPairs(mine.map((m) => ({ degreeId: m.degreeId, courseId: m.courseId })));
      } catch {
        // Couldn't load assignments — treat as "assigned to nothing" rather
        // than silently falling back to showing every application.
        setAssignedPairs([]);
      }
    }).catch(() => { });
  }, []);

  // null → not a Document-Admin (or still resolving): no restriction.
  // an array (possibly empty) → restricted to exactly these degree+course pairs.
  const assignedDegreeIds = useMemo(
    () => new Set((assignedPairs ?? []).map((p) => p.degreeId)),
    [assignedPairs]
  );
  const assignedCourseIds = useMemo(
    () => new Set((assignedPairs ?? []).map((p) => p.courseId)),
    [assignedPairs]
  );
  const assignedPairKeys = useMemo(
    () => new Set((assignedPairs ?? []).map((p) => `${p.degreeId}::${p.courseId}`)),
    [assignedPairs]
  );

  const scopedDegrees = useMemo(() => {
    if (assignedPairs === null) return degreesData;
    return degreesData.filter((d) => assignedDegreeIds.has(d.id));
  }, [degreesData, assignedPairs, assignedDegreeIds]);

  const scopedCourses = useMemo(() => {
    if (assignedPairs === null) return coursesData;
    return coursesData.filter((c) => assignedCourseIds.has(c.id));
  }, [coursesData, assignedPairs, assignedCourseIds]);

  const degreeOptions = useMemo(
    () => scopedDegrees.map((d) => ({ label: d.degreeName, value: d.id })),
    [scopedDegrees]
  );
  const courseOptions = useMemo(
    () => scopedCourses.map((c) => ({ label: c.name, value: c.id })),
    [scopedCourses]
  );

  const yearOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [];
    for (const y of academicYears) {
      const label = y.batchYear ?? "";
      if (!label || seen.has(label)) continue;
      seen.add(label);
      opts.push({ label, value: label });
    }
    return opts;
  }, [academicYears]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = expandedRows.filter((r) => {
      const matchesSearch =
        q === "" ||
        r.applicationNumber.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q);
      const matchesStatus =
        filters.status.length === 0 ||
        filters.status.some((s) => (NAME_TO_STATUS[s] ?? s) === r.documentStatus);
      const matchesDegree = filters.degree.length === 0 || filters.degree.includes(r.degreeId);
      const matchesCourse = filters.course.length === 0 || filters.course.includes(r.courseId);
      const matchesCategory = filters.category.length === 0 || filters.category.includes(r.categoryId);
      const matchesYear = filters.year.length === 0 || (!!r.batchYear && filters.year.includes(r.batchYear));
      const matchesAssignment =
        assignedPairs === null || assignedPairKeys.has(`${r.degreeId}::${r.courseId}`);
      // Only fee-paid (or fee-exempt — e.g. existing BSc students in AY
      // 2023-2024, who never get a fee payment record) students are shown.
      return matchesSearch && matchesStatus && matchesDegree && matchesCourse && matchesCategory && matchesYear && matchesAssignment && (r.isAppFeePaid || r.isFeeExempt);
    });
    // Stable sort: pending/rejected first, verified last. Array.prototype.sort
    // is stable in modern JS engines, so rows keep their original relative
    // order within each status bucket (e.g. still respecting whatever order
    // expandedRows produced, such as recency).
    return matched.sort(
      (a, b) => DOCUMENT_STATUS_RANK[a.documentStatus] - DOCUMENT_STATUS_RANK[b.documentStatus]
    );
  }, [expandedRows, searchQuery, filters, assignedPairs, assignedPairKeys]);

  const handleTogglePostPaymentEdit = useCallback(async (row: Row) => {
    if (!row.isAdmissionFeePaid) return;
    setTogglingPostPaymentEditId(row.id);
    try {
      // Base the toggle on whether access is *currently active* (not just the
      // raw stored flag) — if a previous grant already expired, clicking
      // grants a fresh 24 hr window instead of just flipping it off again.
      const nextValue = !isEditAccessActive(row.verification);
      // Optimistic timestamp for the immediate UI — the 24 hr clock really
      // runs off the record's server-side "updateOn" audit stamp, which this
      // same update call should set. We use whatever the service hands back
      // when it does; this local value just keeps the button from flickering
      // until the next refresh confirms the real one.
      const nowIso = new Date().toISOString();
      let updated: ApplicationVerification;

      if (row.verification?.id) {
        const draft = { ...row.verification, postPaymentEdit: nextValue, updateOn: nowIso } as ApplicationVerification;
        // updateApplicationVerification only returns { success: boolean } — it
        // doesn't hand back the saved record, so we can't read the server's
        // real updateOn here. We rely on our optimistic draft's timestamp;
        // the 60s expiry poll and any subsequent list refresh will reconcile
        // it against the true server value.
        await updateApplicationVerification(draft);
        updated = draft;
      } else {
        updated = await createApplicationVerification({
          applicationId: row.id,
          appNo: row.applicationNumber,
          postPaymentEdit: nextValue,
        });
        updated = { updateOn: nowIso, ...updated } as ApplicationVerification;
      }

      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, verification: updated } : r)));
      setSelectedRow((prevSelected) =>
        prevSelected && prevSelected.id === row.id ? { ...prevSelected, verification: updated } : prevSelected
      );
      setExistingVerification((prev) => (selectedRow?.id === row.id ? updated : prev));

      showToast(
        nextValue
          ? "Post-payment editing enabled for 24 hours."
          : "Post-payment editing disabled.",
        "success"
      );
    } catch {
      showToast("Failed to update post-payment edit access.", "error");
    } finally {
      setTogglingPostPaymentEditId(null);
    }
  }, [selectedRow, showToast]);

  // Auto-lock edit access 24 hrs after it was enabled. Polls quietly in the
  // background (mirrors the admission-fee poll above) and patches the
  // backend record for any row whose grant has expired, so access doesn't
  // stay open just because nobody happened to reopen this page.
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; }, [rows]);
  const selectedRowIdRef = useRef<string | null>(null);
  useEffect(() => { selectedRowIdRef.current = selectedRow?.id ?? null; }, [selectedRow]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const expired = rowsRef.current.filter(
        (r) => r.verification?.postPaymentEdit && !isEditAccessActive(r.verification)
      );
      if (expired.length === 0) return;

      const results = await Promise.allSettled(
        expired.map(async (r) => {
          const updated: ApplicationVerification = {
            ...(r.verification as ApplicationVerification),
            postPaymentEdit: false,
          } as ApplicationVerification;
          await updateApplicationVerification(updated);
          return { id: r.id, updated };
        })
      );
      const succeeded = results
        .filter((r): r is PromiseFulfilledResult<{ id: string; updated: ApplicationVerification }> => r.status === "fulfilled")
        .map((r) => r.value);
      if (succeeded.length === 0) return;

      setRows((prev) =>
        prev.map((r) => {
          const match = succeeded.find((s) => s.id === r.id);
          return match ? { ...r, verification: match.updated } : r;
        })
      );
      setSelectedRow((prev) => {
        if (!prev) return prev;
        const match = succeeded.find((s) => s.id === prev.id);
        return match ? { ...prev, verification: match.updated } : prev;
      });
      setExistingVerification((prev) => {
        const match = succeeded.find((s) => s.id === selectedRowIdRef.current);
        return match ? match.updated : prev;
      });
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Bulk fee enable: eligibility + selection ── */
  // Eligible = accepted, degree type allows fees, verification record exists, fees not already enabled.
  const isFeeEligible = useCallback((r: Row) => {
    return (
      r.documentStatus === "verified" &&
      !!r.degreeType2 &&
      FEE_ENABLED_DEGREE_TYPE2.has(r.degreeType2) &&
      !!r.verification?.id &&
      !r.verification?.feesEnabled
    );
  }, []);

  const feeEligibleRows = useMemo(() => {
    const eligible = filteredRows.filter(isFeeEligible);
    const seen = new Set<string>();
    const deduped: Row[] = [];
    for (const r of eligible) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      deduped.push(r);
    }
    return deduped;
  }, [filteredRows, isFeeEligible]);

  const allEligibleSelected =
    feeEligibleRows.length > 0 && feeEligibleRows.every((r) => selectedFeeIds.has(r.id));

  const toggleFeeSelection = useCallback((id: string) => {
    setSelectedFeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllEligible = useCallback(() => {
    setSelectedFeeIds((prev) => {
      const eligibleIds = feeEligibleRows.map((r) => r.id);
      const allSelected = eligibleIds.length > 0 && eligibleIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(eligibleIds);
    });
  }, [feeEligibleRows]);

  const startFeeBulkMode = () => {
    // Pre-filter to Accepted applications so the admin picks from a
    // manageable, relevant list rather than everything.
    statusFilterBeforeBulkMode.current = filters.status ?? [];
    setFilters((prev) => ({ ...prev, status: ["Accepted"] }));
    setSelectedFeeIds(new Set());
    setFeeBulkMode(true);
  };

  const exitFeeBulkMode = () => {
    setFeeBulkMode(false);
    setSelectedFeeIds(new Set());
    // Restore whatever the status filter was before bulk mode forced it to
    // "Accepted" — leaves any other filter changes made during bulk mode intact.
    setFilters((prev) => ({ ...prev, status: statusFilterBeforeBulkMode.current }));
  };

  const handleBulkEnableFees = async () => {
    if (selectedFeeIds.size === 0) return;
    setBulkEnablingFees(true);
    try {
      const targets = rows.filter((r) => selectedFeeIds.has(r.id) && isFeeEligible(r));
      const results = await Promise.allSettled(
        targets.map(async (r) => {
          const updated: ApplicationVerification = { ...(r.verification as ApplicationVerification), feesEnabled: true };
          await updateApplicationVerification(updated);
          return { id: r.id, updated };
        })
      );

      const succeeded = results
        .filter((r): r is PromiseFulfilledResult<{ id: string; updated: ApplicationVerification }> => r.status === "fulfilled")
        .map((r) => r.value);
      const failedCount = results.length - succeeded.length;

      if (succeeded.length > 0) {
        setRows((prev) =>
          prev.map((r) => {
            const match = succeeded.find((s) => s.id === r.id);
            return match ? { ...r, verification: match.updated } : r;
          })
        );
        // Keep the currently-open modal (if any) in sync too.
        setExistingVerification((prev) => {
          if (!selectedRow) return prev;
          const match = succeeded.find((s) => s.id === selectedRow.id);
          return match ? match.updated : prev;
        });
      }

      if (failedCount === 0) {
        showToast(`Fees enabled for ${succeeded.length} student${succeeded.length === 1 ? "" : "s"}.`, "success");
      } else if (succeeded.length === 0) {
        showToast("Failed to enable fees for the selected students.", "error");
      } else {
        showToast(`Fees enabled for ${succeeded.length}, failed for ${failedCount}.`, "info");
      }

      setSelectedFeeIds(new Set());
    } catch {
      showToast("Failed to enable fees for the selected students.", "error");
    } finally {
      setBulkEnablingFees(false);
    }
  };

  const filterSections = useMemo(() => [
    { title: "Degree", key: "degree", options: degreeOptions },
    { title: "Course", key: "course", options: courseOptions },
    { title: "Category", key: "category", options: categoryOptions },
    { title: "Status", key: "status", options: statusOptions },
    { title: "Year", key: "year", options: yearOptions },
  ], [degreeOptions, courseOptions, categoryOptions, statusOptions, yearOptions]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const [activeDegreeTypeTab, setActiveDegreeTypeTab] = useState<string | null>(null);

  const degreeTypeName = useCallback(
    (id: string) => (id ? (degreeTypeNameMap[id] ?? "—") : "Unassigned"),
    [degreeTypeNameMap]
  );

  const groupedByDegreeType = useMemo(() => {
    // Level 1: by degreeTypeId
    const typeMap = new Map<string, DisplayRow[]>();
    for (const r of filteredRows) {
      const key = r.degreeTypeId || "unassigned";
      if (!typeMap.has(key)) typeMap.set(key, []);
      typeMap.get(key)!.push(r);
    }
    return Array.from(typeMap.entries()).map(([degreeTypeId, typeRows]) => {
      const degreeGroupMap = new Map<string, DisplayRow[]>();
      for (const r of typeRows) {
        const key = r.degreeId || "unassigned";
        if (!degreeGroupMap.has(key)) degreeGroupMap.set(key, []);
        degreeGroupMap.get(key)!.push(r);
      }
      const byDegree = Array.from(degreeGroupMap.entries()).map(([degreeId, degreeRows]) => {
        // Level 3: by courseId within this degree
        const courseGroupMap = new Map<string, DisplayRow[]>();
        for (const r of degreeRows) {
          const key = r.courseId || "unassigned";
          if (!courseGroupMap.has(key)) courseGroupMap.set(key, []);
          courseGroupMap.get(key)!.push(r);
        }
        return { degreeId, byCourse: Array.from(courseGroupMap.entries()) };
      });
      return { degreeTypeId, byDegree };
    });
  }, [filteredRows]);

  useEffect(() => {
    if (groupedByDegreeType.length === 0) return;
    const stillExists = groupedByDegreeType.some((g) => g.degreeTypeId === activeDegreeTypeTab);
    if (!stillExists) setActiveDegreeTypeTab(groupedByDegreeType[0].degreeTypeId);
  }, [groupedByDegreeType, activeDegreeTypeTab]);

  const columns = useMemo(() => [
    ...(feeBulkMode
      ? [{
        header: "Select",
        accessor: "id" as const,
        render: (r: DisplayRow) => {
          const eligible = isFeeEligible(r);
          return (
            <span
              title={
                eligible
                  ? "Select to enable fees"
                  : r.verification?.feesEnabled
                    ? "Fees already enabled"
                    : "Not eligible — must be Accepted and a fee-applicable degree"
              }
            >
              <Checkbox
                checked={selectedFeeIds.has(r.id)}
                disabled={!eligible}
                onChange={() => toggleFeeSelection(r.id)}
                colorHex="#820000"
              />
            </span>
          );
        },
      }]
      : []),
    {
      header: "Application No.",
      accessor: "applicationNumber" as const,
      render: (r: DisplayRow) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-semibold text-primary">{r.applicationNumber}</span>
          {/* Same application shown under more than one course — badge marks
              which preference this particular course is for. */}
          {r.preferenceCount > 1 && !!r.displayPreferenceRank && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 text-indigo-600 shrink-0">
              P{r.displayPreferenceRank}
            </span>
          )}
        </span>
      ),
    },
    { header: "Student Name", accessor: "studentName" as const },
    { header: "Quota", accessor: "quota" as const },
    {
      header: "Status",
      accessor: "documentStatus" as const,
      render: (r: DisplayRow) => (
        <span className="inline-flex items-center gap-1.5">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[r.documentStatus]}`}>
            {r.documentStatus.charAt(0).toUpperCase() + r.documentStatus.slice(1)}
          </span>
          {r.isAdmitted && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Admitted
            </span>
          )}
        </span>
      ),
    },
    {
      header: "Edit Access",
      accessor: "id" as const,
      render: (r: DisplayRow) => {
        const active = isEditAccessActive(r.verification);
        const expiredGrant = !!r.verification?.postPaymentEdit && !active;
        const feePaid = r.isAdmissionFeePaid;
        const busy = togglingPostPaymentEditId === r.id;
        const remaining = active ? editAccessRemainingLabel(r.verification) : null;
        return (
          <button
            type="button"
            disabled={!feePaid || busy}
            onClick={() => handleTogglePostPaymentEdit(r)}
            title={
              !feePaid
                ? "Available once admission fee is paid"
                : active
                  ? `${remaining ?? "Editing enabled"} — click to lock now`
                  : expiredGrant
                    ? "Previous access expired after 24 hrs — click to re-enable"
                    : "Click to allow editing for 24 hours"
            }
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${active
              ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              : "border-primary/30 text-primary hover:bg-primary/5"
              }`}
          >
            {busy ? "…" : active ? "Disable" : "Enable"}
          </button>
        );
      },
    },
    ...(!isDocumentAdmin
      ? [{
        header: "Verified By",
        accessor: "verification" as const,
        render: (r: DisplayRow) => (
          <span className="text-xs text-gray-600">
            {resolveVerifierName(r.verification?.insertBy) || "—"}
          </span>
        ),
      }]
      : []),
  ], [isDocumentAdmin, resolveVerifierName, feeBulkMode, selectedFeeIds, isFeeEligible, toggleFeeSelection, togglingPostPaymentEditId, handleTogglePostPaymentEdit]);

  const handleView = useCallback(async (row: Row) => {
    setSelectedRow(row);
    setExistingVerification(row.verification);
    setRemark(row.verification?.remark ?? "");
    setRemarkError("");
    setModalDocs(row.documents);
    setFeePayments(row.feePayments);
    setManualFeePayments([]);
    setFeeStructure(row.feeStructure);
    setPrevRegNo(row.previousRegistrationNo);
    setAcademicYearDesc(null);
    setBatchYear(null);
    setBatchAcademicYearDesc(null);
    setCoursePreferences(
      row.degreeId
        ? [{ id: "", degreeId: row.degreeId ?? "", courseId: row.courseId ?? "", preference: 1, degree: row.degree, course: row.course, acceptedYn: false }]
        : []
    );
    setAllCoursePreferences(
      row.degreeId
        ? [{ id: "", degreeId: row.degreeId ?? "", courseId: row.courseId ?? "", preference: 1, degree: row.degree, course: row.course, acceptedYn: false }]
        : []
    );
    setSelectedPreferenceId(null);
    setModalOpen(true);

    try {
      const full = await getFullApplicationByAppNo(row.applicationNumber);

      const verif = (full.verification ?? null) as ApplicationVerification | null;
      setExistingVerification((prev) => (verif ? { ...verif, ...prev } : prev));
      setRemark((prev) => (verif?.remark ?? prev) || "");
      setModalDocs((full.documents ?? []) as ApplicationDocument[]);
      setFeePayments((full.feePayments ?? []) as FeeCollectionResponse[]);
      setManualFeePayments((full.manualFeePayments ?? []) as FeeCollectionManualResponse[]);

      const courseDetails = (full.courseDetails ?? []) as CourseDetailItem[];
      const allFeePayments = (full.feePayments ?? []) as FeeCollectionResponse[];
      const appFeePayments = allFeePayments.filter((f) =>
        (f.feeType ?? "").toLowerCase().includes("application fee")
      );

      const paidDetails = courseDetails.filter(
        (d) =>
          !!d.previousRegistrationNo ||
          appFeePayments.some((f) => f.courseId === d.courseId)
      );

      const rankedDetails = [...paidDetails].sort(
        (a, b) => preferenceRank(a.preference) - preferenceRank(b.preference)
      );

      const sortedPrefs: PreferenceRow[] = rankedDetails.map((d, i) => ({
        id: d.id,
        degreeId: d.degreeId ?? "",
        courseId: d.courseId,
        preference: preferenceRank(d.preference) || i + 1,
        degree: d.degreeId ? (degreeMapRef.current[d.degreeId] ?? "—") : "—",
        course: d.courseId ? (courseMapRef.current[d.courseId] ?? "—") : "—",
        acceptedYn: !!d.acceptedYn,
      }));
      setCoursePreferences(sortedPrefs);

      // Unfiltered — every course preference on the application, regardless
      // of whether an Application Fee payment happens to match its courseId.
      const rankedAllDetails = [...courseDetails].sort(
        (a, b) => preferenceRank(a.preference) - preferenceRank(b.preference)
      );
      const sortedAllPrefs: PreferenceRow[] = rankedAllDetails.map((d, i) => ({
        id: d.id,
        degreeId: d.degreeId ?? "",
        courseId: d.courseId,
        preference: preferenceRank(d.preference) || i + 1,
        degree: d.degreeId ? (degreeMapRef.current[d.degreeId] ?? "—") : "—",
        course: d.courseId ? (courseMapRef.current[d.courseId] ?? "—") : "—",
        acceptedYn: !!d.acceptedYn,
      }));
      setAllCoursePreferences(sortedAllPrefs);

      const alreadyAccepted = sortedPrefs.find((p) => p.acceptedYn);
      // The row that was clicked is already scoped to one specific course
      // (see expandedRows) — so the preference being acted on here is
      // always that course's, never a free choice between several. Lock to
      // it (falling back to the already-accepted one, then the single-pref
      // case) rather than leaving it unset for the admin to pick.
      const ownPref = row.courseId ? sortedPrefs.find((p) => p.courseId === row.courseId) : undefined;
      setSelectedPreferenceId(
        ownPref?.id ?? alreadyAccepted?.id ?? (sortedPrefs.length === 1 ? sortedPrefs[0].id : null)
      );

      const cd = rankedDetails[0];
      if (cd) {
        setPrevRegNo(cd.previousRegistrationNo ?? null);

        // Academic Year — the application's own academicYearId (when it applied)
        const currentAcademicYearId = (full.application as any)?.academicYearId;
        const currentYearMatch = currentAcademicYearId
          ? academicYears.find((y) => y.id === currentAcademicYearId)
          : undefined;
        setAcademicYearDesc(currentYearMatch?.description ?? null);

        const isCertificateCourse = cd.degreeId
          ? degreeType2MapRef.current[cd.degreeId] === "CertificateCourse"
          : false;

        if (isCertificateCourse) {
          // Certificate Course students aren't tied to a batch — reuse the
          // same Academic Year text shown above as the Batch Year instead.
          // No real batchId here, so nothing to check for fee exemption.
          setBatchYear(currentYearMatch?.description ?? null);
          setBatchAcademicYearDesc(null);
        } else {
          const batchMatch = cd.batchId
            ? academicYears.find((y) => y.id === cd.batchId)
            : undefined;
          setBatchYear(batchMatch?.batchYear ?? currentYearMatch?.batchYear ?? null);
          setBatchAcademicYearDesc(batchMatch?.description ?? null);
        }

        /* Fee structure + verification sync can happen concurrently — neither
           depends on the other's result. */
        const batchIdForFee = cd.previousRegistrationNo ? (cd.batchId ?? null) : null;
        const fee = await getFeeByFilters(
          cd.degreeId,
          cd.courseId,
          full.application.categoryId ?? null,
          batchIdForFee
        );
        setFeeStructure(fee);
      }

      if (verif) {
        const mergedVerif: ApplicationVerification = { ...verif, ...row.verification };
        const newStatus = resolveStatus(mergedVerif.verificationStatus);
        setRows((prev) =>
          prev.map((r) => r.id === row.id ? { ...r, documentStatus: newStatus, verification: mergedVerif } : r)
        );
      }
    } catch {
    }
  }, [academicYears]);

  const hasActiveSearchOrFilter = searchQuery.trim() !== "" || Object.values(filters).some((f) => f.length > 0);
  useEffect(() => {
    if (!hasActiveSearchOrFilter) {
      setExpandedGroups(new Set());
      return;
    }
    const next = new Set<string>();
    groupedByDegreeType.forEach(({ degreeTypeId, byDegree }) => {
      byDegree.forEach(({ degreeId, byCourse }) => {
        next.add(`dg:${degreeTypeId}::${degreeId}`);
        byCourse.forEach(([courseId]) => next.add(`cs:${degreeTypeId}::${degreeId}::${courseId}`));
      });
    });
    setExpandedGroups(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filters]);

  const appFeePaidRecord = useMemo<FeeCollectionResponse | null>(() => {
    return feePayments
      .filter((f) => (f.feeType ?? "").toLowerCase().includes("application fee") && (f.status ?? "").toUpperCase() === "SUCCESS")
      .sort((a, b) => new Date(b.paymentDate ?? "").getTime() - new Date(a.paymentDate ?? "").getTime())[0] ?? null;
  }, [feePayments]);

  const sortedAdmissionFeePayments = useMemo<FeeCollectionResponse[]>(() => {
    return feePayments
      .filter((f) => (f.feeType ?? "").toLowerCase().includes("admission fee"))
      .sort((a, b) => new Date(b.paymentDate ?? "").getTime() - new Date(a.paymentDate ?? "").getTime());
  }, [feePayments]);

  const paidPreferenceCourseIds = useMemo<Set<string>>(() => {
    const paidRecords = feePayments.filter(
      (f) => (f.feeType ?? "").toLowerCase().includes("application fee") && (f.status ?? "").toUpperCase() === "SUCCESS"
    );
    const withCourseId = paidRecords
      .map((f) => f.courseId)
      .filter((id): id is string => !!id);

    if (withCourseId.length > 0) return new Set(withCourseId);
    return paidRecords.length > 0 ? new Set(coursePreferences.map((p) => p.courseId)) : new Set();
  }, [feePayments, coursePreferences]);

  // Shared exemption check — same rule used by application_fee.tsx / layoutConfig.ts.
  // Checked against the student's BATCH year (cd.batchId), not the current
  // application's academicYearId — the application year is always whatever
  // year the student is applying in now, not their original 2023-2024 batch.
  const isFeeExempt = useMemo(
    () =>
      !!prevRegNo &&
      isBScDegreeName(selectedRow?.degree) &&
      (batchAcademicYearDesc ?? "").trim() === FEE_EXEMPT_ACADEMIC_YEAR,
    [prevRegNo, selectedRow?.degree, batchAcademicYearDesc]
  );

  // "Accepted" unlocks only if THIS course's fee was paid or exempt — not
  // just any course on the application (Application Fee is per course).
  const isAppFeePaid =
    isFeeExempt ||
    (selectedRow?.courseId ? paidPreferenceCourseIds.has(selectedRow.courseId) : !!appFeePaidRecord);

  // Application Fee card data — was an inline IIFE in JSX, recomputing on
  // every render (e.g. every Remark keystroke). Memoized so it only reruns
  // when the underlying fee/course data actually changes.
  const applicationFeeDisplay = useMemo(() => {
    const allAppFeesRaw = [...feePayments]
      .filter((f) => (f.feeType ?? "").toLowerCase().includes("application fee"))
      .sort((a, b) => new Date(b.paymentDate ?? "").getTime() - new Date(a.paymentDate ?? "").getTime());

    const anyCourseIdKnown = allAppFeesRaw.some((f) => !!f.courseId);
    const relevantCourseId = allCoursePreferences.length > 1 ? (selectedRow?.courseId || null) : null;
    const scopeToCourse = anyCourseIdKnown && !!relevantCourseId;

    const allAppFees = scopeToCourse
      ? allAppFeesRaw.filter((f) => f.courseId === relevantCourseId)
      : allAppFeesRaw;

    return {
      allAppFees,
      paid: allAppFees.some((f) => (f.status ?? "").toUpperCase() === "SUCCESS"),
      isExistingStudent: !!prevRegNo,
      showsUnscopedNotice: allCoursePreferences.length > 1 && !scopeToCourse && allAppFeesRaw.length > 0,
    };
  }, [feePayments, allCoursePreferences, selectedRow?.courseId, prevRegNo]);

  // Admission Fee card data — same reasoning as applicationFeeDisplay above.
  const admissionFeeDisplay = useMemo(() => {
    const allOnline = sortedAdmissionFeePayments;
    const allManual = manualFeePayments.filter((f) =>
      (f.feeName ?? "").toLowerCase().includes("admission fee")
    );

    const anyCourseIdKnown =
      allOnline.some((f) => !!(f as unknown as { courseId?: string }).courseId) ||
      allManual.some((f) => !!f.courseId);
    const relevantCourseId = allCoursePreferences.length > 1 ? (selectedRow?.courseId || null) : null;
    const scopeToCourse = anyCourseIdKnown && !!relevantCourseId;

    const onlineFees = scopeToCourse
      ? allOnline.filter((f) => (f as unknown as { courseId?: string }).courseId === relevantCourseId)
      : allOnline;
    const onlinePaid = onlineFees.filter((f) => (f.status ?? "").toUpperCase() === "SUCCESS");
    const onlineTotal = onlinePaid.reduce((s, f) => s + (f.paidAmount ?? f.amount), 0);

    const manualFees = scopeToCourse
      ? allManual.filter((f) => f.courseId === relevantCourseId)
      : allManual;
    const manualTotal = manualFees.reduce((s, f) => s + (f.feeAmount ?? 0), 0);

    return {
      onlineFees,
      manualFees,
      grandTotal: onlineTotal + manualTotal,
      hasAny: onlineFees.length > 0 || manualFees.length > 0,
      showsUnscopedNotice:
        allCoursePreferences.length > 1 && !scopeToCourse && (allOnline.length > 0 || allManual.length > 0),
      courseLabelFor: (courseId?: string | null) =>
        allCoursePreferences.length > 1 && courseId
          ? (allCoursePreferences.find((p) => p.courseId === courseId)?.course ?? null)
          : null,
    };
  }, [sortedAdmissionFeePayments, manualFeePayments, allCoursePreferences, selectedRow?.courseId]);

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  /* ── Save verification ── */
  const handleVerify = async (optionName: string) => {
    if (!selectedRow) return;
    if (REMARK_REQUIRED.has(optionName) && !remark.trim()) {
      setRemarkError("Remark is required for this decision.");
      return;
    }
    if (optionName === "Accepted" && coursePreferences.length > 1 && !selectedPreferenceId) {
      showToast("Select which preference is being accepted.", "error");
      return;
    }
    setSaving(true);
    try {
      if (optionName === "Accepted" && selectedPreferenceId) {
        await acceptCourseDetailPreference(selectedRow.id, selectedPreferenceId);
        setCoursePreferences((prev) =>
          prev.map((p) => ({ ...p, acceptedYn: p.id === selectedPreferenceId }))
        );
      }

      const payload: ApplicationVerification = {
        applicationId: selectedRow.id,
        appNo: selectedRow.applicationNumber,
        verificationStatus: optionName,
        remark: remark.trim() || undefined,
      };
      let saved: ApplicationVerification;
      if (existingVerification?.id) {
        await updateApplicationVerification({ ...payload, id: existingVerification.id });
        saved = { ...existingVerification, ...payload };
      } else {
        saved = await createApplicationVerification(payload);
      }
      const newStatus = resolveStatus(optionName);
      setRows((prev) =>
        prev.map((r) =>
          r.id === selectedRow.id ? { ...r, documentStatus: newStatus, verification: saved } : r
        )
      );

      setExistingVerification(saved);
      showToast(`Document marked as "${optionName}".`, "success");
      if (optionName !== "Accepted") {
        setModalOpen(false);
        setSelectedRow(null);
      }
    } catch {
      showToast("Failed to save verification. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Installment ── */
  const handleApproveInstallment = async () => {
    if (!existingVerification?.id || !selectedRow) return;
    setApprovingInstallment(true);
    try {
      const updated = { ...existingVerification, installment: 2 };
      await updateApplicationVerification(updated);
      setRows((prev) => prev.map((r) => r.id === selectedRow.id ? { ...r, verification: updated } : r));
      setExistingVerification(updated);
      showToast("Installment approved successfully.", "success");
    } catch {
      showToast("Failed to approve installment.", "error");
    } finally {
      setApprovingInstallment(false);
    }
  };

  const handleEnableFees = async () => {
    if (!existingVerification?.id || !selectedRow) return;
    setEnablingFees(true);
    try {
      const updated = { ...existingVerification, feesEnabled: true };
      await updateApplicationVerification(updated);
      setRows((prev) => prev.map((r) => r.id === selectedRow.id ? { ...r, verification: updated } : r));
      setExistingVerification(updated);
      showToast("Admission fees enabled for this student.", "success");
    } catch {
      showToast("Failed to enable fees.", "error");
    } finally {
      setEnablingFees(false);
    }
  };

  const handleRemoveInstallment = async () => {
    if (!existingVerification?.id || !selectedRow) return;
    setRemovingInstallment(true);
    try {
      const updated = { ...existingVerification, installment: 0 };
      await updateApplicationVerification(updated);
      setRows((prev) => prev.map((r) => r.id === selectedRow.id ? { ...r, verification: updated } : r));
      setExistingVerification(updated);
      showToast("Installment removed successfully.", "success");
    } catch {
      showToast("Failed to remove installment.", "error");
    } finally {
      setRemovingInstallment(false);
    }
  };

  const hasActiveFilters = searchQuery !== "" || Object.values(filters).some((f) => f.length > 0);

  return (
    <AppLayout pageTitle="Document Verification">
      {toast && (
        <div className="fixed z-50 top-5 right-5">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}

      <div className="pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 text-white shadow-sm bg-primary rounded-2xl shrink-0">
            <FileUserIcon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="mt-1 text-sm italic font-semibold text-gray-500 sm:text-base">
              Review and Verify student applications.
            </p>
          </div>
          {!feeBulkMode ? (
            <Button variant="primary" onClick={startFeeBulkMode}>
              Enable Admission Fees for Multiple Students
            </Button>
          ) : (
            <Button variant="secondary" onClick={exitFeeBulkMode}>
              Exit Selection
            </Button>
          )}
        </div>

        {feeBulkMode && (
          <div className="sticky top-0 z-10 flex flex-col items-start justify-between gap-3 p-3 border rounded-lg shadow-sm sm:flex-row sm:items-center bg-primary/5 border-primary/30">
            <div className="flex items-center gap-3">
              <Checkbox
                label={`Select all eligible (${feeEligibleRows.length})`}
                checked={allEligibleSelected}
                disabled={feeEligibleRows.length === 0}
                onChange={toggleSelectAllEligible}
                colorHex="#820000"
              />
              <span className="text-xs text-gray-500">
                {selectedFeeIds.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={bulkEnablingFees} onClick={exitFeeBulkMode}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={selectedFeeIds.size === 0 || bulkEnablingFees}
                onClick={handleBulkEnableFees}
              >
                {bulkEnablingFees
                  ? "Enabling…"
                  : `Enable Fees${selectedFeeIds.size > 0 ? ` (${selectedFeeIds.size})` : ""}`}
              </Button>
            </div>
          </div>
        )}

        {/* Search + Filters */}
        <div className="p-4 bg-white border rounded-lg">
          <div className="flex flex-col items-end gap-3 md:flex-row">
            <div className="relative flex-1 min-w-0">
              <Input
                label="Search by Application Number or Name"
                placeholder="e.g., APP-001 or student name"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                type="text"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="absolute text-gray-400 transition -translate-y-1/2 right-3 top-1/2 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <FilterPanel
              sections={filterSections}
              values={filters}
              onChange={(key, values) => setFilters((prev) => ({ ...prev, [key]: values }))}
            />
            {hasActiveFilters && (
              <Button variant="outline" onClick={() => { setSearchQuery(""); setFilters({ degree: [], course: [], category: [], status: [], year: [] }); }}>
                Clear All
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            {loading
              ? "Loading…"
              : assignedPairs !== null && assignedPairs.length === 0
                ? "No degrees or courses assigned to you yet."
                : `Showing ${filteredRows.length} ${filteredRows.length === 1 ? "entry" : "entries"} across ${rows.length} application${rows.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center p-12 bg-white border rounded-lg">
            <Loader />
          </div>
        ) : assignedPairs !== null && assignedPairs.length === 0 ? (
          <div className="p-12 text-center bg-white border rounded-lg">
            <FileUserIcon size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">You haven't been assigned any degrees or courses yet</p>
            <p className="mt-1 text-xs text-gray-400">Kindly wait, or contact your admin to get access set up.</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center bg-white border rounded-lg">
            <Search size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">No applications found</p>
            <p className="mt-1 text-xs text-gray-400">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-hidden bg-white border rounded-lg">
            {/* ── Degree Type tabs ── */}
            <div className="flex gap-1 px-2 overflow-x-auto overflow-y-hidden border-b bg-slate-50/60">
              {groupedByDegreeType.map(({ degreeTypeId, byDegree }) => {
                const typeRows = byDegree.flatMap(({ byCourse }) => byCourse.flatMap(([, rs]) => rs));
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
                      {typeRows.length}
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
                  {byDegree.map(({ degreeId, byCourse }) => {
                    const dgKey = `dg:${degreeTypeId}::${degreeId}`;
                    const dgOpen = expandedGroups.has(dgKey);
                    const degreeRows = byCourse.flatMap(([, rs]) => rs);
                    return (
                      <div
                        key={dgKey}
                        className={`overflow-hidden bg-white border rounded-xl transition-shadow ${dgOpen ? "border-primary/30 shadow-sm" : "border-slate-200"}`}
                      >
                        <div
                          className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-slate-50"
                          onClick={() => toggleGroup(dgKey)}
                        >
                          <span className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition ${dgOpen ? "bg-primary/15 text-primary" : "text-slate-400"}`}>
                            {dgOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </span>
                          <span className="text-sm font-semibold truncate text-slate-700">
                            {degreeId ? (degreeMap[degreeId] ?? "—") : "Unassigned Degree"}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 shrink-0">
                            {byCourse.length} course{byCourse.length === 1 ? "" : "s"}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 shrink-0">
                            {degreeRows.length} application{degreeRows.length === 1 ? "" : "s"}
                          </span>
                        </div>

                        {/* ── Courses within this Degree ── */}
                        {dgOpen && (
                          <div className="px-3 pb-3 space-y-2 border-t border-slate-100 pt-2.5 bg-slate-50/40">
                            {byCourse.map(([courseId, courseRows]) => {
                              const csKey = `cs:${degreeTypeId}::${degreeId}::${courseId}`;
                              const csOpen = expandedGroups.has(csKey);

                              // Fees-not-yet-enabled records surface first, then the rest.
                              const sortedCourseRows = [...courseRows].sort((a, b) => {
                                const aEnabled = !!a.verification?.feesEnabled;
                                const bEnabled = !!b.verification?.feesEnabled;
                                return Number(aEnabled) - Number(bEnabled);
                              });
                              const courseVerifiedCount = courseRows.filter((r) => r.documentStatus === "verified").length;
                              // Actual admission is a separate step from verification
                              // (Accepted) — only count rows with a real AdmittedStudent
                              // record (admitYn === true), same source of truth as
                              // admit-students.tsx.
                              const courseAdmittedCount = courseRows.filter((r) => r.isAdmitted).length;
                              const courseRejectedCount = courseRows.filter((r) => r.documentStatus === "rejected").length;
                              const coursePendingCount = courseRows.filter((r) => r.documentStatus === "pending").length;

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
                                    <span className="text-sm font-semibold truncate text-slate-700">
                                      {courseId ? (courseMap[courseId] ?? "—") : "Unassigned Course"}
                                    </span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 shrink-0">
                                      {courseRows.length} application{courseRows.length === 1 ? "" : "s"}
                                    </span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-700 shrink-0">
                                      {courseVerifiedCount} verified
                                    </span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-700 shrink-0">
                                      {courseAdmittedCount} admitted
                                    </span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-red-100 text-red-700 shrink-0">
                                      {courseRejectedCount} rejected
                                    </span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-700 shrink-0">
                                      {coursePendingCount} pending
                                    </span>
                                  </div>

                                  {/* Innermost: application rows */}
                                  {csOpen && (
                                    <div className="pb-3 border-t border-slate-100">
                                      <Table columns={columns} data={sortedCourseRows} onView={handleView} />
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
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      <Modal
        open={modalOpen}
        title="Document Verification"
        onClose={() => { setModalOpen(false); setSelectedRow(null); }}
        size="xl"
      >
        {selectedRow && (
          <div className="space-y-5">

            {/* Student + Course info */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="p-4 space-y-3 border rounded-lg bg-gray-50">
                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Student Information</p>
                {[
                  { label: "Application No.", value: selectedRow.applicationNumber },
                  { label: "Student Name", value: selectedRow.studentName },
                  { label: "Email", value: selectedRow.email },
                  { label: "Phone", value: selectedRow.phone },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-semibold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 space-y-3 border rounded-lg bg-gray-50">
                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Course Information</p>

                <div>
                  {/* Always the specific course of the row that was clicked —
                      each row is now scoped to one preference/course (see
                      expandedRows), so this must never list every preference
                      the student applied under, only the one being verified
                      right now. The full list of other paid preferences still
                      shows further down in "Preferences Applied", for context. */}
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Degree</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedRow.degree}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-2">Course</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedRow.course}</p>
                </div>

                {[
                  { label: "Quota", value: selectedRow.quota },
                  { label: "Address", value: selectedRow.address },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-semibold text-gray-800">{value}</p>
                  </div>
                ))}
                {prevRegNo && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Previous Registration No.</p>
                    <p className="text-sm font-semibold text-blue-700">{prevRegNo}</p>
                  </div>
                )}
                {academicYearDesc && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Academic Year</p>
                    <p className="text-sm font-semibold text-gray-800">{academicYearDesc}</p>
                  </div>
                )}
                {batchYear && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Batch Year</p>
                    <span className="inline-block mt-0.5 px-2.5 py-1 rounded-full text-sm font-semibold text-teal-700 bg-teal-100 border border-teal-700">
                      {batchYear}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Fee Payments ── */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

              {(() => {
                const { allAppFees, paid, isExistingStudent, showsUnscopedNotice } = applicationFeeDisplay;
                const feeExempt = isFeeExempt;
                return (
                  <div className="overflow-hidden border rounded-lg">
                    <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
                      <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase">Application Fee</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${paid || feeExempt ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                        {feeExempt ? "Waived" : paid ? "Paid" : "Not Paid"}
                      </span>
                    </div>
                    <div className="px-3 py-3">
                      {showsUnscopedNotice && (
                        <p className="mb-2 text-[10px] text-amber-600">
                          Older payment records here don't have a course reference, so this may include
                          payments made for a different preference.
                        </p>
                      )}
                      {feeExempt ? (
                        <p className="text-xs font-medium text-blue-600">
                          Existing student, Bachelor of Science (Batch {FEE_EXEMPT_ACADEMIC_YEAR}) — fee waived
                        </p>
                      ) : isExistingStudent && !paid ? (
                        <p className="mb-2 text-[10px] text-amber-600">
                          Lateral entry (Previous Reg. No. {prevRegNo}), but doesn't meet the fee-waiver criteria
                          — application fee is still due.
                        </p>
                      ) : null}
                      {!feeExempt && allAppFees.length > 0 ? (
                        <div className="space-y-2.5">
                          {allAppFees.map((f) => {
                            const prefCourseLabel = allCoursePreferences.length > 1 && f.courseId
                              ? allCoursePreferences.find((p) => p.courseId === f.courseId)?.course
                              : null;
                            const badge = FEE_BADGE[(f.status ?? "").toLowerCase()] ?? "bg-gray-100 text-gray-600";
                            return (
                              <div key={f.id} className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  {prefCourseLabel && (
                                    <p className="text-[10px] font-semibold text-indigo-600 truncate">{prefCourseLabel}</p>
                                  )}
                                  <p className="text-sm font-bold text-gray-800">₹{(f.paidAmount ?? f.amount).toLocaleString("en-IN")}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{f.receiptNumber}</p>
                                  <p className="text-[10px] text-gray-400">{fmtDate(f.paymentDate)}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${badge}`}>{f.status ?? "—"}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No payment recorded</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Admission Fee — online first, manual fallback */}
              {(() => {
                const { onlineFees, manualFees, grandTotal, hasAny, showsUnscopedNotice, courseLabelFor } = admissionFeeDisplay;
                return (
                  <div className="overflow-hidden border rounded-lg">
                    <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
                      <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase">Admission Fee</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${grandTotal > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {grandTotal > 0 ? `₹${grandTotal.toLocaleString("en-IN")} Paid` : "Not Paid"}
                      </span>
                    </div>
                    <div className="px-3 py-3">
                      {showsUnscopedNotice && (
                        <p className="mb-2 text-[10px] text-amber-600">
                          Older payment records here don't have a course reference, so this may include
                          payments made for a different preference.
                        </p>
                      )}
                      {!hasAny ? (
                        <p className="text-xs text-gray-400">Admission fee not yet paid</p>
                      ) : (
                        <div className="space-y-2">
                          {onlineFees.map((f) => {
                            const badge = FEE_BADGE[(f.status ?? "").toLowerCase()] ?? "bg-gray-100 text-gray-600";
                            const courseLabel = courseLabelFor((f as unknown as { courseId?: string }).courseId);
                            return (
                              <div key={f.id} className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  {courseLabel && (
                                    <p className="text-[10px] font-semibold text-indigo-600 truncate">{courseLabel}</p>
                                  )}
                                  <p className="text-xs font-medium text-gray-700 truncate">{f.feeType ?? "Admission Fee"}</p>
                                  <p className="text-xs font-bold text-gray-800">₹{(f.paidAmount ?? f.amount).toLocaleString("en-IN")}</p>
                                  {f.receiptNumber && (
                                    <p className="text-[10px] text-gray-400 font-mono">{f.receiptNumber} · {fmtDate(f.paymentDate)}</p>
                                  )}
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${badge}`}>{f.status ?? "—"}</span>
                              </div>
                            );
                          })}
                          {manualFees.map((f) => {
                            const courseLabel = courseLabelFor(f.courseId);
                            return (
                              <div key={f.id} className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  {courseLabel && (
                                    <p className="text-[10px] font-semibold text-indigo-600 truncate">{courseLabel}</p>
                                  )}
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-medium text-gray-700 truncate">{f.feeName ?? "Admission Fee"}</p>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-semibold shrink-0">Manual</span>
                                  </div>
                                  <p className="text-xs font-bold text-gray-800">₹{(f.feeAmount ?? 0).toLocaleString("en-IN")}</p>
                                  {f.receiptNo && (
                                    <p className="text-[10px] text-gray-400 font-mono">{f.receiptNo} · {fmtDate(f.paymentDate)}</p>
                                  )}
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-emerald-100 text-emerald-700">SUCCESS</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Current verification status */}
            {existingVerification?.verificationStatus && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg flex-wrap">
                <span className="text-xs text-gray-500">Current status:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[NAME_TO_STATUS[existingVerification.verificationStatus] ?? "pending"]}`}>
                  {existingVerification.verificationStatus}
                </span>
                {existingVerification.remark && (
                  <span className="ml-1 text-xs text-gray-400">— {existingVerification.remark}</span>
                )}
                {!isDocumentAdmin && existingVerification.insertBy && (
                  <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Verified by {resolveVerifierName(existingVerification.insertBy)}
                  </span>
                )}
              </div>
            )}

            {coursePreferences.length > 1 && (() => {
              const paidPreferences = coursePreferences.filter((p) => paidPreferenceCourseIds.has(p.courseId));
              if (paidPreferences.length === 0) return null;
              return (
                <div className="pt-4 border-t">
                  <p className="text-sm font-semibold text-gray-700">
                    Preferences Applied ({paidPreferences.length})
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Check the preference being admitted before marking as Accepted.
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {paidPreferences.map((p, i) => {
                      const checked = selectedPreferenceId === p.id;
                      // The modal was opened for one specific course (the
                      // row clicked) — the admin can verify/accept only
                      // that course from here. If Course A's row was
                      // clicked, Course B (and any other preference) is
                      // shown for context but locked out, and vice versa.
                      const isOwnCourse = !selectedRow.courseId || p.courseId === selectedRow.courseId;
                      const disabled = saving || !isOwnCourse;
                      return (
                        <label
                          key={p.id || i}
                          className={`flex items-center gap-2.5 px-3 py-2 bg-gray-50 border rounded-lg transition-colors ${checked ? "border-primary ring-1 ring-primary/40 bg-primary/5" : "border-gray-200"
                            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-gray-300"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => setSelectedPreferenceId(checked ? null : p.id)}
                            className="accent-current text-primary"
                          />
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold text-primary bg-primary/10">
                            P{p.preference}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">
                            {p.degree} <span className="font-normal text-gray-400">—</span> {p.course}
                          </span>
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-emerald-700 bg-emerald-100">
                            Application Fee paid
                          </span>
                          {p.acceptedYn && (
                            <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-emerald-700 bg-emerald-100">
                              Accepted
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Uploaded Documents */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Uploaded Documents</p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await previewApplicationPdfAdmin(selectedRow.applicationNumber);
                    } catch {
                      showToast("Application PDF not found or could not be generated.", "error");
                    }
                  }}
                >
                  <FileText size={14} />
                  View Application
                </Button>
              </div>

              {modalDocs.length > 0 ? (
                <div className="space-y-2">
                  {modalDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 transition border rounded-lg bg-gray-50 hover:bg-gray-100">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="flex-shrink-0 text-primary" />
                        <p className="text-sm font-medium text-gray-800">{doc.documentName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openDocumentFile(doc.id)} className="transition text-primary hover:text-primary/70" title="View">
                          <FileText size={16} />
                        </button>
                        <button onClick={() => downloadDocumentFile(doc.id)} className="transition text-primary hover:text-primary/70" title="Download">
                          <Download size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 border border-dashed rounded-lg bg-gray-50">
                  <FolderOpen size={28} className="mb-2" />
                  <p className="text-sm">No documents uploaded yet</p>
                </div>
              )}
            </div>

            {/* Remark */}
            <div className="pt-4 border-t">
              <Textarea
                label="Remark"
                placeholder="Enter remark (required for Rejected or Pending/On Hold)"
                value={remark}
                rows={3}
                onChange={(e) => { setRemark(e.target.value); setRemarkError(""); }}
                error={remarkError}
              />
            </div>

            {/* Verification Buttons */}
            <div className="pt-4 space-y-2 border-t">
              {!isAppFeePaid && (
                <p className="text-xs font-medium text-right text-amber-600">
                  "Accepted" is locked until the Application Fee is paid successfully.
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {verificationOptions.map((opt) => {
                  const blocked = opt.name === "Accepted" && !isAppFeePaid;
                  return (
                    <button
                      key={opt.id}
                      disabled={saving || blocked}
                      onClick={() => handleVerify(opt.name)}
                      title={blocked ? "Application Fee must be paid before accepting" : undefined}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_STYLE[opt.name] ?? "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                    >
                      {saving ? "Saving…" : opt.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fee Particulars — always visible when fee structure exists */}
            {feeStructure?.details && feeStructure.details.length > 0 && (() => {
              const inst1Details = feeStructure.details.filter((d) => d.installment1);
              const inst2Details = feeStructure.details.filter((d) => d.installment2);
              const inst1Total = inst1Details.reduce((s, d) => s + ((d.installment1Amount && d.installment1Amount > 0) ? d.installment1Amount : (d.amount ?? 0)), 0);
              const inst2Total = inst2Details.reduce((s, d) => s + ((d.installment2Amount && d.installment2Amount > 0) ? d.installment2Amount : (d.amount ?? 0)), 0);
              const hasInstallments = inst1Details.length > 0 || inst2Details.length > 0;

              return (
                <div className="pt-4 space-y-3 border-t">
                  <p className="text-sm font-semibold text-gray-700">Fee Particulars</p>

                  {hasInstallments ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {/* Installment 1 */}
                      <div className="overflow-hidden border rounded-lg">
                        <div className="px-3 py-2 bg-primary">
                          <p className="text-xs font-semibold tracking-wide text-white uppercase">Installment 1</p>
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="px-3 py-1.5 text-left font-medium text-gray-500">Particular</th>
                              <th className="px-3 py-1.5 text-right font-medium text-gray-500">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inst1Details.length > 0 ? inst1Details.map((d, i) => (
                              <tr key={d.id ?? i} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="px-3 py-1.5 text-gray-700">{d.particularName ?? "—"}</td>
                                <td className="px-3 py-1.5 text-right text-gray-700">
                                  ₹{((d.installment1Amount && d.installment1Amount > 0) ? d.installment1Amount : (d.amount ?? 0)).toLocaleString()}
                                </td>
                              </tr>
                            )) : (
                              <tr><td colSpan={2} className="px-3 py-3 text-center text-gray-400">No items</td></tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-primary bg-primary/5">
                              <td className="px-3 py-2 font-semibold text-gray-800">Total</td>
                              <td className="px-3 py-2 font-bold text-right text-primary">₹{inst1Total.toLocaleString()}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Installment 2 */}
                      <div className="overflow-hidden border rounded-lg">
                        <div className="px-3 py-2 bg-gray-600">
                          <p className="text-xs font-semibold tracking-wide text-white uppercase">Installment 2</p>
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="px-3 py-1.5 text-left font-medium text-gray-500">Particular</th>
                              <th className="px-3 py-1.5 text-right font-medium text-gray-500">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inst2Details.length > 0 ? inst2Details.map((d, i) => (
                              <tr key={d.id ?? i} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="px-3 py-1.5 text-gray-700">{d.particularName ?? "—"}</td>
                                <td className="px-3 py-1.5 text-right text-gray-700">
                                  ₹{((d.installment2Amount && d.installment2Amount > 0) ? d.installment2Amount : (d.amount ?? 0)).toLocaleString()}
                                </td>
                              </tr>
                            )) : (
                              <tr><td colSpan={2} className="px-3 py-3 text-center text-gray-400">No items</td></tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-gray-400 bg-gray-50">
                              <td className="px-3 py-2 font-semibold text-gray-800">Total</td>
                              <td className="px-3 py-2 font-bold text-right text-gray-700">₹{inst2Total.toLocaleString()}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* No installment split — show single full table */
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="text-white bg-primary">
                          <tr>
                            <th className="px-3 py-2 font-semibold text-left">Particular</th>
                            <th className="px-3 py-2 font-semibold text-right">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feeStructure.details.map((d, i) => (
                            <tr key={d.id ?? i} className="border-t hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-800">{d.particularName ?? "—"}</td>
                              <td className="px-3 py-2 font-medium text-right text-gray-800">₹{(d.amount ?? 0).toLocaleString()}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-primary bg-primary/5">
                            <td className="px-3 py-2 font-semibold text-gray-800">Total</td>
                            <td className="px-3 py-2 font-bold text-right text-primary">₹{(feeStructure.totalAmount ?? 0).toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Enable Fees — only for Certificate Course / PG degrees when Accepted */}
            {existingVerification?.verificationStatus === "Accepted" &&
              !!selectedRow?.degreeType2 &&
              FEE_ENABLED_DEGREE_TYPE2.has(selectedRow.degreeType2) && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Admission Fees</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {existingVerification.feesEnabled
                        ? "Admission fees have been enabled for this student."
                        : "Enable admission fee payment for this student."}
                    </p>
                  </div>
                  <div>
                    {existingVerification.feesEnabled ? (
                      <span className="px-3 py-1.5 text-sm font-semibold text-emerald-700 bg-emerald-100 rounded-lg border border-emerald-300">
                        Fees Enabled
                      </span>
                    ) : (
                      <button
                        disabled={enablingFees}
                        onClick={handleEnableFees}
                        className="px-4 py-2 text-sm font-semibold transition-colors border rounded-lg border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50"
                      >
                        {enablingFees ? "Enabling…" : "Enable Fees"}
                      </button>
                    )}
                  </div>
                </div>
              )}

            {/* Installment approval — only when Accepted, hidden for Document-Admin */}
            {!isDocumentAdmin && existingVerification?.verificationStatus === "Accepted" && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Installment Approval</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {existingVerification.installment ? "2 installments approved." : "Approve installment for this student."}
                  </p>
                </div>
                <div>
                  {existingVerification.installment ? (
                    <button disabled={removingInstallment} onClick={handleRemoveInstallment}
                      className="px-4 py-2 text-sm font-semibold text-red-600 transition-colors border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50">
                      {removingInstallment ? "Removing…" : "Remove Installment"}
                    </button>
                  ) : (
                    <button disabled={approvingInstallment} onClick={handleApproveInstallment}
                      className="px-4 py-2 text-sm font-semibold transition-colors border rounded-lg border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50">
                      {approvingInstallment ? "Approving…" : "Approve Installment"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}