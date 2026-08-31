import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  Clock,
  ShieldCheck,
  User,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  GraduationCap,
  Receipt,
  ClipboardList,
  Plus,
  Minus,
  XCircle,
  Info,
  ArrowRight,
  Lock,
} from "lucide-react";
import Button from "../../../components/ui/Button";
import AppLayout from "../../../components/layouts/AppLayout";
import Toast from "../../../components/ui/Toast";
import { getMyFullApplication } from "../../../services/applicationQueryService";
import { getCourseDetailsByApplicationId } from "../../../services/applicationCourseDetailService";
import { getCourseById } from "../../../services/courseService";
import { getDegreeById } from "../../../services/degreeService";
import { getLookupsByType } from "../../../services/lookupService";
import { generateReceiptNumber } from "../../../services/receiptSequenceService";
import { createFeeCollection, getFeesByApplicationId, type FeeCollectionResponse } from "../../../services/feeCollectionService";
import { createPaymentLink } from "../../../services/easebuzzService";
import { resolveApplicationFee, getApplicationFees, type ApplicationFee as ApplicationFeeConfig } from "../../../services/applicationFeeService";
import { useAdmissionLock } from "../../../hooks/useAdmissionLock";

// ── Added for the "all steps must be complete" gate on this page ──────────
import { getSeatTypesByApplicationId } from "../../../services/seatTypeService";
import { getEducationByApplicationId } from "../../../services/educationService";
import { getPgEducationByApplicationId } from "../../../services/pgEducationService";
import { getRegistrationByUsername } from "../../../services/registrationService";
import { getApplicationPhoto } from "../../../services/applicationPhotoService";
import { getDocumentsByAppId } from "../../../services/documentService";
import {
  resolveRequiredDocuments,
  DEGREE_MARKS_DOC_NAME,
  type ApplicantDocumentContext,
} from "../../../services/documentRequirementService";

/* ─── Types ───────────────────────────────────────────────────────────────── */

/* Applicant-level info — the stuff that's the same regardless of how many
   degree/course combinations the student has applied under (PG applicants
   can have several; UG typically has one). */
type ApplicantInfo = {
  applicationId: string;
  appNo: string;
  name: string;
  phone: string;
  email: string;
  categoryName: string;
  nationalityName: string;
  categoryId?: string;
  academicYearId?: string;
};

/* One row per degree+course combination attached to the application.
   Each carries its own fee resolution, batch selection, and paid/pay state —
   these do NOT get shared across rows. */
type CourseFeeItem = {
  // Stable key for this course detail row. Falls back to index if the API
  // doesn't return an id on the course-detail record — check this against
  // your actual DTO shape.
  key: string;
  degreeId?: string;
  courseId?: string;
  degreeName: string;
  courseName: string;
  isCertificationCourse: boolean;
  // Existing students (has a USN) applying for Bachelor of Science don't pay
  // an application fee — fresh applicants and every other degree still do.
  feeExempt: boolean;
  batchOptions: { batchTypeId: string; batchTypeName: string }[];
  selectedBatchTypeId?: string;
  applicationFee: number;
  platformFee: number;
  feeConfigured: boolean;
  feeDebugReason?: string;
  paid: boolean;
  paidReceipt?: FeeCollectionResponse;
};

/* One row per prerequisite that must be finished before fee payment unlocks.
   `path` is where the "Complete now" button sends the student. */
type ChecklistStep = {
  key: string;
  label: string;
  done: boolean;
  path: string;
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function RecordCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="px-5 py-3.5 first:border-r first:border-border">
      <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-semibold truncate ${highlight ? "text-primary" : "text-text"}`}>{value}</p>
    </div>
  );
}

function RecordSelectCell({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  options: { id: string; name: string }[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="px-5 py-3.5">
      <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">{label}</p>
      {options.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => {
            const isSelected = opt.id === selectedId;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                  isSelected
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-text border-border hover:border-primary/50"
                }`}
              >
                {opt.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm font-semibold truncate text-text">
          {options[0]?.name ?? "—"}
        </p>
      )}
    </div>
  );
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function FeePaymentPage() {
  const { locked, checking: lockChecking } = useAdmissionLock();
  const navigate = useNavigate();
  const [applicant, setApplicant] = useState<ApplicantInfo | null>(null);
  const [courses, setCourses] = useState<CourseFeeItem[]>([]);
  const [checklist, setChecklist] = useState<ChecklistStep[]>([]);
  const [fetching, setFetching] = useState(true);
  const [payingKey, setPayingKey] = useState<string | null>(null); // which row's Pay Now is in flight
  const [openKey, setOpenKey] = useState<string | null>(null); // which accordion row is expanded
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateCourse = (key: string, patch: Partial<CourseFeeItem>) => {
    setCourses((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  };

  // Kept for certificate-course batch selection — same idea as before, just
  // scoped to a single row instead of the whole page's info state.
  const handleBatchChange = async (item: CourseFeeItem, batchTypeId: string) => {
    if (!item.degreeId || !item.courseId || !applicant) return;

    try {
      const allFees = await getApplicationFees(true);
      const match = allFees.find(
        (r) =>
          r.degreeId === item.degreeId &&
          r.courseId === item.courseId &&
          r.categoryId === applicant.categoryId &&
          r.academicYearId === applicant.academicYearId &&
          r.batchTypeId === batchTypeId
      );

      updateCourse(item.key, {
        selectedBatchTypeId: batchTypeId,
        applicationFee: match?.amount ?? 0,
        platformFee: match?.platformCharges ?? 0,
        feeConfigured: !!match,
        feeDebugReason: match ? undefined : "No ApplicationFee config found for the selected batch.",
      });
    } catch (err) {
      console.error("[FeePaymentPage] failed to refetch fee for batch change:", err);
      showToast("Failed to load fee for selected batch.", "error");
    }
  };

  const handleCreatePayment = async (item: CourseFeeItem) => {
    if (!applicant || !item.feeConfigured || item.paid) return;

    setPayingKey(item.key);

    try {
      const receiptNumber = await generateReceiptNumber();

      const uiFeeType = "Application Fee";
      const paymentFeeType = "MGRDPU";

      const { paymentUrl } = await createPaymentLink({
        receiptNo: receiptNumber,
        applicationId: applicant.applicationId,
        name: applicant.name,
        email: applicant.email === "—" ? "" : applicant.email,
        phone: applicant.phone === "—" ? "" : applicant.phone,
        collegePayable: item.applicationFee,
        serviceCharge: item.platformFee,
        feeType: paymentFeeType,
      });

      // Now real, typed fields — createFeeCollectionDto and the response
      // both carry degreeId/courseId, so the "already paid" lookup below
      // can disambiguate rows for a single application properly.
      await createFeeCollection({
        applicationId: applicant.applicationId,
        applicationNo: applicant.appNo,
        name: applicant.name,
        email: applicant.email === "—" ? undefined : applicant.email,
        mobile: applicant.phone === "—" ? undefined : applicant.phone,
        feeType: uiFeeType,
        degreeId: item.degreeId,
        courseId: item.courseId,
        amount: item.applicationFee,
        platformCharges: item.platformFee,
        receiptNumber,
      });

      localStorage.setItem("easebuzz_receipt", receiptNumber);
      window.location.href = paymentUrl;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

      showToast(msg ?? "Failed to initiate payment.", "error");
      setPayingKey(null);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [fullResult, categories, nationalities] = await Promise.all([
          getMyFullApplication(),
          getLookupsByType("Category", ""),
          getLookupsByType("Nationality", ""),
        ]);

        const app = fullResult.application;
        if (!app) return;

        const categoryLookup = categories.find((c) => c.id === app.categoryId);
        const categoryName = categoryLookup?.name ?? app.categoryId ?? "—";
        const nationalityName =
          nationalities.find((n) => n.id === app.nationalityId)?.name ?? app.nationalityId ?? "—";

        setApplicant({
          applicationId: app.id,
          appNo: app.appNo,
          name: app.name,
          phone: app.phone ?? "—",
          email: app.email ?? "—",
          categoryName,
          nationalityName,
          categoryId: app.categoryId,
          academicYearId: app.academicYearId,
        });

        let existingFees: FeeCollectionResponse[] = [];
        try {
          existingFees = await getFeesByApplicationId(app.id);
        } catch (err) {
          console.error("[FeePaymentPage] getFeesByApplicationId failed:", err);
        }

        const courseDetails = await getCourseDetailsByApplicationId(app.id);
        console.log("[FeePaymentPage] courseDetails for app", app.id, "=", courseDetails);

        // Existing students (has a USN) are exempt from the application fee,
        // but only for Bachelor of Science — fresh applicants pay regardless
        // of degree. Hoisted above the checklist block so the course-row
        // building loop below can also read hasUsn.
        const username = localStorage.getItem("username") ?? "";
        let hasUsn = false;
        let isPG = false;
        let academicYearDescription: string | undefined;
        if (username) {
          try {
            const reg = await getRegistrationByUsername(username);
            hasUsn = !!reg?.usnNo;
            academicYearDescription = reg?.academicYearDescription;
            if (reg?.degreeTypeName) {
              const s = String(reg.degreeTypeName).toLowerCase();
              isPG = s.includes("pg") || s.includes("post");
            }
          } catch {
            // No registration record — treat as a fresh UG applicant.
          }
        }

        // ── Build the "all steps complete" checklist ──────────────────────
        // Fee payment only unlocks once Education, Degree & Course, Seat
        // Type, Photo & Signature, and Documents are all done. Personal
        // Details is implicitly done — the application record above
        // couldn't exist otherwise.
        try {
          const [eduRecords, pgRecords, seatTypes, photoRecord, docLookups, uploadedDocs] =
            await Promise.all([
              getEducationByApplicationId(app.id).catch(() => []),
              isPG ? getPgEducationByApplicationId(app.id).catch(() => []) : Promise.resolve([]),
              getSeatTypesByApplicationId(app.id).catch(() => []),
              getApplicationPhoto(app.id).catch(() => null),
              getLookupsByType("Document", "").catch(() => []),
              getDocumentsByAppId(app.id).catch(() => []),
            ]);

          const educationDone = isPG ? pgRecords.length > 0 : eduRecords.length > 0;
          // USN/existing students never see the Seat Type section at all —
          // seat_degree.tsx hides it for them and requires a Previous
          // Registration Number instead. seatTypes.length would always be 0
          // for them (unless they separately checked the standalone
          // "Inservice" toggle), so check that field instead — same rule as
          // admission-fee.tsx.
          const previousRegistrationNo = courseDetails[0]?.previousRegistrationNo ?? null;
          const seatTypeDone = hasUsn ? !!previousRegistrationNo?.trim() : seatTypes.length > 0;
          const degreeCourseDone = courseDetails.length > 0;
          // Parent/Guardian signature is optional (see photo.tsx) — only
          // student photo + student signature are required to gate fee payment.
          const photoDone = !!(photoRecord?.photoUrl && photoRecord?.signatureUrl);

          const selNat = nationalities.find((n) => n.id === app.nationalityId);
          const selCat = categories.find((c) => c.id === app.categoryId);
          const selectedSeatTypeNames = seatTypes.map((s: { seatTypeName: string }) => s.seatTypeName);
          const has12th = isPG
            ? pgRecords.some((r: { examLevel?: string }) => r.examLevel?.startsWith("12th"))
            : eduRecords.some((r: { examName?: string }) => r.examName?.startsWith("12th"));
          const hasDiploma = isPG
            ? pgRecords.some((r: { examLevel?: string }) => r.examLevel?.startsWith("Diploma"))
            : eduRecords.some((r: { examName?: string }) => r.examName?.startsWith("Diploma"));

          const docCtx: ApplicantDocumentContext = {
            nationalityCode: selNat?.code ?? "001",
            isKarnataka: app.karnatakaYn === true,
            isNonGmCategory: !!selCat && (selCat.code ?? "") !== "008",
            selectedSeatTypeNames,
            has12th,
            hasDiploma,
          };

          let requiredDocs = resolveRequiredDocuments(docLookups, docCtx);
          if (hasUsn) {
            const usnDocs = await getLookupsByType("Document", "ONLY_USN").catch(() => []);
            const seen = new Set(requiredDocs.map((d) => d.id));
            requiredDocs = [
              ...requiredDocs,
              ...usnDocs
                .filter((l) => !seen.has(l.id))
                .map((l) => ({ id: l.id, documentName: l.name ?? "", triggerRule: l.type2 ?? "", triggerLabel: "" })),
            ];
          }

          const uploadedNames = new Set(uploadedDocs.map((d) => d.documentName));
          const totalRequiredDocs = requiredDocs.length + (isPG ? 1 : 0);
          const doneRequiredDocs =
            requiredDocs.filter((d) => uploadedNames.has(d.documentName)).length +
            (isPG && uploadedNames.has(DEGREE_MARKS_DOC_NAME) ? 1 : 0);
          const documentsDone = totalRequiredDocs === 0 || doneRequiredDocs >= totalRequiredDocs;

          setChecklist([
            { key: "education", label: "Education details", done: educationDone, path: "/student/application" },
            { key: "degreeCourse", label: "Degree & Course selection", done: degreeCourseDone, path: "/student/application" },
            { key: "seatType", label: "Seat Type selection", done: seatTypeDone, path: "/student/application" },
            { key: "photo", label: "Photo & Signature upload", done: photoDone, path: "/student/photos" },
            { key: "documents", label: "Document upload", done: documentsDone, path: "/student/documents" },
          ]);
        } catch (err) {
          console.error("[FeePaymentPage] checklist computation failed:", err);
          // Fail safe: if completeness can't be determined, don't block a
          // student who has otherwise clearly finished everything — but do
          // log it so it can be investigated.
        }

        if (!courseDetails.length) {
          setCourses([]);
          return;
        }

        const allFeesActive = await getApplicationFees(true);
        const batchLookups = await getLookupsByType("Batch", "").catch(() => []);

        const items: CourseFeeItem[] = await Promise.all(
          courseDetails.map(async (cd, idx) => {
            const key = (cd as unknown as { id?: string }).id ?? `${cd.degreeId}-${cd.courseId}-${idx}`;

            let degreeName = "—";
            let courseName = "—";
            let applicationFee = 0;
            let platformFee = 0;
            let feeConfigured = false;
            let feeDebugReason: string | undefined;
            let isCertificationCourse = false;
            let feeExempt = false;
            let batchOptions: { batchTypeId: string; batchTypeName: string }[] = [];
            let selectedBatchTypeId: string | undefined;

            try {
              const [degree, course] = await Promise.all([
                getDegreeById(cd.degreeId),
                getCourseById(cd.courseId),
              ]);
              degreeName = degree.degreeName;
              courseName = course.name;
              isCertificationCourse = degreeName.trim().toLowerCase() === "certificate course";
              feeExempt =
                hasUsn &&
                degreeName.trim().toLowerCase() === "bachelor of science" &&
                academicYearDescription?.trim() === "2023-2024";

              if (feeExempt) {
                // Existing student, Bachelor of Science — no application fee.
                // Deliberately skip fee resolution entirely.
              } else if (isCertificationCourse) {
                // TEMPORARY: batch is hardcoded to "Batch-2" for display, and
                // deliberately left OUT of the fee-matching criteria below.
                // Whatever is (or isn't) actually saved as cd.batchTypeId is
                // ignored here — this is a stopgap until batch selection is
                // properly wired end-to-end again.
                const normalize = (s: string) => s.trim().toLowerCase().replace(/[\s\-_]/g, "");
                const batch2 = batchLookups.find((b) => normalize(b.name ?? "") === "batch2");

                selectedBatchTypeId = batch2?.id ?? "batch-2";
                batchOptions = [{
                  batchTypeId: batch2?.id ?? "batch-2",
                  batchTypeName: batch2?.name ?? "Batch-2",
                }];

                const match = allFeesActive.find(
                  (r) =>
                    r.degreeId === cd.degreeId &&
                    r.courseId === cd.courseId &&
                    r.categoryId === app.categoryId &&
                    r.academicYearId === app.academicYearId
                );

                if (match) {
                  applicationFee = match.amount;
                  platformFee = match.platformCharges;
                  feeConfigured = true;
                } else {
                  feeDebugReason = "No ApplicationFee config found for this degree/course/category/academic year.";
                }
              } else {
                const feeConfig: ApplicationFeeConfig | undefined = await resolveApplicationFee({
                  degreeId: cd.degreeId,
                  courseId: cd.courseId,
                  categoryId: app.categoryId,
                  academicYearId: app.academicYearId,
                });

                if (feeConfig) {
                  applicationFee = feeConfig.amount;
                  platformFee = feeConfig.platformCharges;
                  feeConfigured = true;
                } else {
                  feeDebugReason = "No ApplicationFee config matched this degree/course/academic year, even after falling back to the GM category.";
                }
              }
            } catch (err) {
              console.error("[FeePaymentPage] course details / fee resolution failed for", cd, err);
              feeDebugReason = `Error while resolving fee: ${err instanceof Error ? err.message : String(err)}`;
            }

            // See the [Guessing] note above the fetch — this can only
            // disambiguate by courseId if the fee record actually carries one.
            const paidRecord = existingFees.find((f) => {
              const sameType = f.feeType === "Application Fee" && f.status === "SUCCESS";
              const recordCourseId = (f as unknown as { courseId?: string }).courseId;
              if (recordCourseId) return sameType && recordCourseId === cd.courseId;
              return sameType; // fallback: can't disambiguate, matches on type only
            });

            return {
              key,
              degreeId: cd.degreeId,
              courseId: cd.courseId,
              degreeName,
              courseName,
              isCertificationCourse,
              feeExempt,
              batchOptions,
              selectedBatchTypeId,
              applicationFee,
              platformFee,
              feeConfigured,
              feeDebugReason,
              paid: !!paidRecord,
              paidReceipt: paidRecord,
            };
          })
        );

        setCourses(items);
        // Open the first unpaid, fee-configured row by default so the
        // student isn't staring at a wall of collapsed accordions.
        const firstActionable = items.find((c) => c.feeConfigured && !c.paid) ?? items[0];
        setOpenKey(firstActionable?.key ?? null);
      } catch {
        showToast("Failed to load application details.", "error");
      } finally {
        setFetching(false);
      }
    };

    load();
  }, []);

  if (lockChecking || fetching) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center gap-3 min-h-[60vh]">
          <div className="w-8 h-8 border-2 rounded-full border-slate-200 border-t-primary animate-spin" />
          <p className="text-sm font-medium text-gray-400">Loading payment details…</p>
        </div>
      </AppLayout>
    );
  }

  if (!applicant) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div
            data-testid="application-not-submitted"
            className="flex flex-col items-center w-full max-w-3xl p-10 text-center bg-white border shadow-sm rounded-xl border-border"
          >
            <div className="flex items-center justify-center mb-4 rounded-full w-14 h-14 bg-primary/10">
              <ClipboardList className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-base font-bold text-text">Please Complete Your Application First</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-600">
              Fee payment will be enabled only after you have filled and successfully submitted all
              the required application details. Kindly go back and complete your application form
              in full — once it is submitted successfully, this page will automatically unlock so
              you can proceed with the application fee payment.
            </p>
            <Button className="mt-5" onClick={() => navigate("/student/application")}>
              Complete Application Now
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const pendingSteps = checklist.filter((s) => !s.done);

  if (pendingSteps.length > 0) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] px-4 py-10">
          <div
            data-testid="application-fee-locked"
            className="flex flex-col items-center w-full max-w-2xl p-8 text-center bg-white border shadow-sm sm:p-10 rounded-xl border-border"
          >
            <div className="flex items-center justify-center mb-4 rounded-full w-14 h-14 bg-amber-100">
              <Lock className="w-7 h-7 text-amber-600" />
            </div>
            <h2 className="text-base font-bold text-text">Application Fee Not Yet Unlocked</h2>
            <p className="max-w-lg mt-2 text-sm font-medium leading-relaxed text-gray-600">
              Application fee payment is enabled only after every step below is complete. Finish the
              remaining step(s), then come back to this page — it will unlock automatically.
            </p>

            <div className="w-full mt-6 overflow-hidden text-left border rounded-lg border-border">
              {checklist.map((step) => (
                <div
                  key={step.key}
                  className={`flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0 border-border ${
                    step.done ? "bg-emerald-50/50" : "bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {step.done ? (
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                    )}
                    <span
                      className={`text-sm font-semibold truncate ${
                        step.done ? "text-emerald-800" : "text-text"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {!step.done && (
                    <button
                      type="button"
                      onClick={() => navigate(step.path)}
                      className="flex items-center gap-1 text-xs font-bold shrink-0 text-primary hover:underline"
                    >
                      Complete now <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <Button className="mt-6" onClick={() => navigate(pendingSteps[0].path)}>
              Continue Application
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!courses.length) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="flex flex-col items-center w-full max-w-3xl p-10 text-center bg-white border shadow-sm rounded-xl border-border">
            <AlertTriangle className="mb-4 w-7 h-7 text-amber-500" />
            <h2 className="text-base font-bold text-text">No Course Details Found</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-600">
              We couldn't find any degree/course selections on your application yet.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const allPaid = courses.every((c) => c.paid || c.feeExempt);
  const paidCount = courses.filter((c) => c.paid || c.feeExempt).length;

  return (
    <AppLayout pageTitle="Application Fee Payment">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div data-testid="app-fee-page" className="max-w-5xl px-4 py-6 mx-auto sm:py-10">
        {locked && (
          <div className="flex items-center gap-3 px-4 py-3 mb-5 border rounded-lg bg-amber-50 border-amber-200 text-amber-700">
            <Lock size={15} className="shrink-0" />
            <p className="text-sm font-medium">
              Your admission fee has been paid. Application fee payment is no longer available from this page.
            </p>
          </div>
        )}

        {/* Header bar */}
        <div className="flex items-center gap-3 pb-5 mb-6 border-b-2 border-primary">
          <GraduationCap className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h1 className="text-lg font-bold leading-tight sm:text-xl text-text">Application Fee Payment</h1>
            <p className="text-sm text-gray-600 sm:text-sm">
              {courses.length > 1
                ? "Review each degree/course you've applied for and complete payment individually."
                : "Review your details and complete the payment"}
            </p>
          </div>
        </div>

        {/* Note: application fee is gated behind full application completion */}
        <div className="flex items-start gap-3 p-4 mb-6 border-l-4 rounded-r-lg border-sky-400 bg-sky-50">
          <Info className="w-5 h-5 mt-0.5 text-sky-600 shrink-0" />
          <p className="text-sm leading-relaxed text-sky-800">
            <span className="font-bold">Note:</span> Application fee payment is enabled only after
            Personal Details, Education, Degree &amp; Course, Seat Type, Photo &amp; Signature upload,
            and Document upload are all completed. Since you're seeing this page, all of these steps
            are done for you.
          </p>
        </div>

        {allPaid ? (
          <div className="flex items-start gap-3 p-4 mb-6 border-l-4 rounded-r-lg border-emerald-500 bg-emerald-50">
            <CheckCircle className="w-5 h-5 mt-0.5 text-emerald-600 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-emerald-900">All application fees paid</h2>
              <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                You've completed payment for every degree/course on this application.
              </p>
            </div>
          </div>
        ) : courses.length > 1 ? (
          <div className="flex items-center gap-4 p-4 mb-6 bg-white border-2 rounded-lg border-primary/20">
            <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
              <svg className="absolute w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  className="text-primary"
                  strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - paidCount / courses.length)}
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-xs font-bold text-primary">
                {paidCount}/{courses.length}
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-text">
                {paidCount} of {courses.length} course fees paid
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Expand a row below and hit Pay Now to clear the rest.
              </p>
            </div>
          </div>
        ) : null}

        {/* Applicant Information — shown once, shared across all course rows */}
        <div className="mb-6 overflow-hidden bg-white border rounded-lg border-border">
          <div className="flex items-center gap-2 px-5 py-3 border-b bg-slate-50 border-border">
            <User className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold tracking-wide uppercase text-slate-600">
              Applicant Information
            </h2>
          </div>
          <div className="divide-y divide-border">
            <div className="grid grid-cols-2">
              <RecordCell label="Application No." value={applicant.appNo} highlight />
              <RecordCell label="Name" value={applicant.name} />
            </div>
            <div className="grid grid-cols-2">
              <RecordCell label="Phone" value={applicant.phone} />
              <RecordCell label="Email" value={applicant.email} />
            </div>
            <div className="grid grid-cols-2">
              <RecordCell label="Category" value={applicant.categoryName} />
              <RecordCell label="Nationality" value={applicant.nationalityName} />
            </div>
          </div>
        </div>

        {/* One accordion row per degree/course combination */}
        <div className="flex flex-col gap-4">
          {courses.map((item) => {
            const isOpen = openKey === item.key;
            const totalPayable = item.applicationFee + item.platformFee;

            return (
              <div
                key={item.key}
                className={`overflow-hidden rounded-xl border-2 shadow-sm transition-shadow hover:shadow-md ${
                  item.paid || item.feeExempt
                    ? "border-emerald-300 bg-emerald-50/40"
                    : item.feeConfigured
                    ? "border-primary/40 bg-white"
                    : "border-amber-300 bg-amber-50/30"
                }`}
              >
                {/* Accordion header — always visible, holds the toggle + Pay Now */}
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${
                    item.paid || item.feeExempt
                      ? "bg-gradient-to-r from-emerald-100 to-emerald-50"
                      : item.feeConfigured
                      ? "bg-gradient-to-r from-primary/10 to-white"
                      : "bg-gradient-to-r from-amber-100 to-amber-50"
                  }`}
                >
                  {/* Clickable zone for expand/collapse — everything except Pay Now */}
                  <button
                    type="button"
                    onClick={() => setOpenKey(isOpen ? null : item.key)}
                    className="flex items-center flex-1 min-w-0 gap-3 text-left group"
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm ${
                        item.paid || item.feeExempt ? "bg-emerald-500" : item.feeConfigured ? "bg-primary" : "bg-amber-500"
                      }`}
                    >
                      <BookOpen className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate text-text">{item.degreeName}</p>
                      <p className="text-xs text-gray-500 truncate">{item.courseName}</p>
                    </div>
                    <span className="items-center hidden gap-1 ml-2 text-xs font-semibold sm:inline-flex text-primary/70 group-hover:text-primary shrink-0">
                      {isOpen ? "Hide details" : "View details"}
                    </span>
                  </button>

                  {/* Status/amount + Pay Now/Receipt — lives on the header, not inside the expanded body */}
                  <div className="flex items-center gap-3 shrink-0">
                    {item.paid ? (
                      <>
                        <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full text-white bg-emerald-500 shadow-sm">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Paid
                        </span>
                        <Button
                          data-testid={`btn-receipt-${item.key}`}
                          className="px-5 py-2 text-sm font-semibold shadow-sm whitespace-nowrap"
                          onClick={() => navigate(`/student/fee-receipt?receipt=${item.paidReceipt?.receiptNumber ?? ""}`)}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Receipt className="w-4 h-4" />
                            Receipt
                          </span>
                        </Button>
                      </>
                    ) : item.feeConfigured ? (
                      <>
                        <span className="text-base font-extrabold text-primary">
                          ₹{totalPayable.toLocaleString("en-IN")}
                        </span>
                        <Button
                          data-testid={`btn-pay-${item.key}`}
                          className="px-5 py-2 text-sm font-semibold shadow-sm whitespace-nowrap"
                          disabled={payingKey === item.key || locked}
                          onClick={() => handleCreatePayment(item)}
                        >
                          <span className="inline-flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            {payingKey === item.key ? "Processing…" : "Pay Now"}
                          </span>
                        </Button>
                      </>
                    ) : item.feeExempt ? (
                      <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full text-white bg-emerald-500 shadow-sm">
                        <CheckCircle className="w-3.5 h-3.5" />
                        No fee required
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 text-xs font-bold rounded-full text-white bg-amber-500 shadow-sm">
                        Not enabled
                      </span>
                    )}

                    {/* Expand/collapse control — separate from Pay Now, no rotating arrow */}
                    <button
                      type="button"
                      onClick={() => setOpenKey(isOpen ? null : item.key)}
                      aria-label={isOpen ? "Collapse details" : "Expand details"}
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 transition-colors ${
                        isOpen
                          ? "bg-primary border-primary text-white"
                          : "bg-white border-primary/30 text-primary hover:border-primary hover:bg-primary/5"
                      }`}
                    >
                      {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Accordion body — details only, no payment action here */}
                {isOpen && (
                  <div className="border-t-2 border-primary/10">
                    {!item.feeConfigured && !item.paid && !item.feeExempt && (
                      <div className="flex items-start gap-3 p-4 border-l-4 border-amber-500 bg-amber-50">
                        <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600 shrink-0" />
                        <div>
                          <h3 className="text-sm font-bold text-amber-900">Application fee not enabled</h3>
                          <p className="mt-1 text-sm leading-relaxed text-amber-800">
                            No application fee has been configured yet for this degree, course, category, and
                            academic year. Please check back later or contact the admissions office.
                          </p>
                        </div>
                      </div>
                    )}

                    {item.feeExempt && !item.paid && (
                      <div className="flex items-start gap-3 p-4 border-l-4 border-emerald-500 bg-emerald-50">
                        <CheckCircle className="w-5 h-5 mt-0.5 text-emerald-600 shrink-0" />
                        <div>
                          <h3 className="text-sm font-bold text-emerald-900">No application fee required</h3>
                          <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                            As an existing student applying for Bachelor of Science, you're exempt from the
                            application fee.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className={item.isCertificationCourse ? "grid grid-cols-[1fr_1.6fr_0.7fr] divide-x divide-border" : "grid grid-cols-2"}>
                      <RecordCell label="Degree" value={item.degreeName} />
                      <RecordCell label="Course" value={item.courseName} />
                      {item.isCertificationCourse && (
                        <RecordSelectCell
                          label="Batch"
                          options={item.batchOptions.map((b) => ({ id: b.batchTypeId, name: b.batchTypeName }))}
                          selectedId={item.selectedBatchTypeId}
                          onSelect={(batchTypeId) => handleBatchChange(item, batchTypeId)}
                        />
                      )}
                    </div>

                    {item.paid ? (
                      <div className="px-6 py-4 border-t border-border bg-emerald-50/50">
                        <p className="text-sm font-semibold text-emerald-900">
                          Receipt No. {item.paidReceipt?.receiptNumber ?? "—"}
                        </p>
                        <p className="text-xs text-emerald-700">
                          Amount Paid ₹{(item.paidReceipt?.paidAmount ?? item.paidReceipt?.amount ?? 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                    ) : item.feeConfigured ? (
                      <div className="px-6 py-5 border-t border-border">
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-sm font-semibold text-slate-600">Application Fee</span>
                            <span className="font-medium text-slate-800">
                              ₹{item.applicationFee.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-semibold text-slate-600">Platform Fee</span>
                            <span className="font-medium text-slate-800">
                              ₹{item.platformFee.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="border-t border-dashed border-slate-300" />
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-base font-semibold text-slate-800">Total Amount</span>
                            <span className="text-2xl font-bold text-primary">
                              ₹{totalPayable.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-2">
                            <p className="flex items-center gap-2 text-xs font-medium text-slate-600">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Secure payment gateway
                            </p>
                            <p className="flex items-center gap-2 text-xs font-medium text-slate-600">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              Instant confirmation
                            </p>
                            <p className="flex items-center gap-2 text-xs font-medium text-slate-600">
                              <Receipt className="w-3.5 h-3.5 text-sky-600" />
                              Receipt after payment
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}