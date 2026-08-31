import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  User,
  BookOpen,
  Layers,
  CheckCircle,
  Lock,
  ShieldCheck,
  Download,
  Info,
  XCircle,
  ArrowRight,
  Landmark,
  Receipt,
} from "lucide-react";
import Button from "../../../components/ui/Button";
import AppLayout from "../../../components/layouts/AppLayout";
import Toast from "../../../components/ui/Toast";
import { getMyFullApplication } from "../../../services/applicationQueryService";
import { getCourseDetailsByApplicationId } from "../../../services/applicationCourseDetailService";
import { getCourseById } from "../../../services/courseService";
import { getDegreeById } from "../../../services/degreeService";
import { getLookupsByType } from "../../../services/lookupService";
import {
  getFeeByFilters,
  type AdmissionFeeStructureDetail,
} from "../../../services/admissionFeeStructureService";
import {
  getConditionalCharges,
  type AdmissionFeeConditionalCharge,
} from "../../../services/admissionFeeConditionalChargeService";
import { getApplicationVerificationByAppNo } from "../../../services/applicationVerificationService";
import { getAcademicYears } from "../../../services/academicYearService";
import { generateReceiptNumber } from "../../../services/receiptSequenceService";
import {
  createFeeCollection,
  getFeesByApplicationId,
  type FeeCollectionResponse,
} from "../../../services/feeCollectionService";
import { createPaymentLink } from "../../../services/easebuzzService";
import { getRegistrationByUsername } from "../../../services/registrationService";
import { getFeeCollectionManualByAppNo, type FeeCollectionManualResponseDto } from "../../../services/feecollectionmanualService";

// ── Added for the "all steps must be complete" gate for USN students ──────
// (Non-USN students already pass through this same checklist on the
// application-fee page before they ever get here — USN students skip that
// page entirely, so this page needs its own copy of the gate.)
import { getSeatTypesByApplicationId } from "../../../services/seatTypeService";
import { getEducationByApplicationId } from "../../../services/educationService";
import { getPgEducationByApplicationId } from "../../../services/pgEducationService";
import { getApplicationPhoto } from "../../../services/applicationPhotoService";
import { getDocumentsByAppId } from "../../../services/documentService";
import {
  resolveRequiredDocuments,
  DEGREE_MARKS_DOC_NAME,
  type ApplicantDocumentContext,
} from "../../../services/documentRequirementService";


const USN_PLATFORM_FEE = 90;
const CERTIFICATION_DEGREE_ID = "a4ed2aa5-fb78-4c8a-8f91-b2f4f2eaba6b";
const FEE_ENABLED_DEGREE_TYPE2 = new Set(["CertificateCourse", "PG"]);



/* ─── Types ───────────────────────────────── */

type FeeInfo = {
  applicationId: string;
  appNo: string;
  name: string;
  phone: string;
  email: string;
  categoryName: string;
  nationalityName: string;
  degreeId?: string;
  courseId?: string;
  degreeName: string;
  courseName: string;
  feeName: string;
  admissionFee: number;
  feeDetails: AdmissionFeeStructureDetail[];
  // late fine from fee structure
  fineAmount: number;
  fineEndDate: string | null;
  isNonKarnataka: boolean;
  isPgInService: boolean;
  conditionalCharges: AdmissionFeeConditionalCharge[];
  conditionalFeeTotal: number;
};

/* One row per prerequisite that must be finished before admission-fee
   payment unlocks for a USN student. `path` is where the "Complete now"
   button sends the student. */
type ChecklistStep = {
  key: string;
  label: string;
  done: boolean;
  path: string;
};

/* ─── Component ───────────────────────────── */

export default function AdmissionFeePage() {
  const navigate = useNavigate();
  const [info, setInfo] = useState<FeeInfo | null>(null);
  const [checklist, setChecklist] = useState<ChecklistStep[]>([]);
  const [fetching, setFetching] = useState(true);
  const [payingInst, setPayingInst] = useState<1 | 2 | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  /* Verification */
  const [verificationStatus, setVerificationStatus] = useState<string | null>(
    null,
  );
  const [installmentCount, setInstallmentCount] = useState(0);

  const [paidAdmFees, setPaidAdmFees] = useState<FeeCollectionResponse[]>([]);
  const [hasUsn, setHasUsn] = useState(false);
  // True only when hasUsn AND degree is Bachelor of Science AND the
  // students-table academic year is "2023-2024" — the actual application-fee
  // exemption rule (same as application_fee.tsx/dashboard.tsx/AppLayout.tsx).
  // hasUsn alone is NOT enough: any other USN student still went through
  // application_fee.tsx and cleared its checklist there.
  const [feeExempt, setFeeExempt] = useState(false);
  const [prevRegNoDisplay, setPrevRegNoDisplay] = useState<string | null>(null);
  const [batchDesc, setBatchDesc] = useState<string | null>(null);
  const [batchYearLabel, setBatchYearLabel] = useState<string | null>(null);
  const [studentDegreeId, setStudentDegreeId] = useState<string | null>(null);
  const [studentDegreeType2, setStudentDegreeType2] = useState<string | null>(null);
  const [feesEnabled, setFeesEnabled] = useState(false);
  // Manual/counter receipts for this application (from the Receipt Entry
  // page). Kept as the full list — not just a "some exist" boolean — so we
  // can total up partial payments and know how much is actually still owed.
  const [manualAdmFees, setManualAdmFees] = useState<FeeCollectionManualResponseDto[]>([]);


  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── LOAD ──────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        // ✅ Backend resolves correct application using session username
        const username = localStorage.getItem("username") ?? "";
        const [fullResult, categories, nationalities, degreeTypes, registration, academicYears] =
          await Promise.all([
            getMyFullApplication(),
            getLookupsByType("Category", ""),
            getLookupsByType("Nationality", ""),
            getLookupsByType("DegreeType", ""),
            username
              ? getRegistrationByUsername(username).catch(() => null)
              : Promise.resolve(null),
            getAcademicYears().catch(() => []),
          ]);

        const isUsnUser = !!registration?.usnNo?.trim();
        if (isUsnUser) setHasUsn(true);

        const app = fullResult.application;

        if (!app) {
          showToast("Application not found.", "error");
          return;
        }

        const appNo = app.appNo;

        // Resolved purely from the student's own saved application data — never
        // a user-editable field on this page.
        const isNonKarnataka = app.karnatakaYn === false;

        const gmCategory = categories.find(
          (c) => c.name?.toUpperCase() === "GM",
        );

        const effectiveCategoryId =
          app.categoryId || gmCategory?.id || undefined;

        const categoryName =
          categories.find((c) => c.id === app.categoryId)?.name ??
          app.categoryId ??
          "—";

        const nationalityName =
          nationalities.find((n) => n.id === app.nationalityId)?.name ??
          app.nationalityId ??
          "—";

        let degreeId: string | undefined;
        let courseId: string | undefined;
        let degreeName = "—";
        let courseName = "—";
        let feeName = "—";
        let admissionFee = 0;
        let feeDetails: AdmissionFeeStructureDetail[] = [];
        let fineAmount = 0;
        let fineEndDate: string | null = null;
        let isPgInService = false;
        let previousRegistrationNo: string | null = null;

        try {
          const courseDetails = await getCourseDetailsByApplicationId(app.id);

          if (courseDetails.length) {
            const cd =
              courseDetails.find((c) => c.acceptedYn === true) ?? courseDetails[0];
            isPgInService = cd.inserviceYn === true;

            const [degree, course] = await Promise.all([
              getDegreeById(cd.degreeId),
              getCourseById(cd.courseId),
            ]);

            degreeId = cd.degreeId;
            courseId = cd.courseId;
            degreeName = degree.degreeName;
            courseName = course.name;
            setStudentDegreeId(cd.degreeId);
            const type2 = degree.degreeTypeId
              ? (degreeTypes.find((dt) => dt.id === degree.degreeTypeId)?.type2 ?? null)
              : null;
            setStudentDegreeType2(type2);
            setPrevRegNoDisplay(cd.previousRegistrationNo ?? null);
            previousRegistrationNo = cd.previousRegistrationNo ?? null;

            if (cd.batchId) {
              const match = academicYears.find((y) => y.id === cd.batchId);
              setBatchDesc(match?.description ?? null);
              setBatchYearLabel(match?.batchYear ?? null);
            }

            const currentAcademicYearId = app.academicYearId ?? null;

            const academicYearIdForFee = cd.previousRegistrationNo

              ? (cd.batchId ?? null)

              : currentAcademicYearId;

            const fee = await getFeeByFilters(

              cd.degreeId,

              cd.courseId,

              effectiveCategoryId,

              academicYearIdForFee,

            );

            if (fee) {
              feeName = fee.feeName ?? "—";
              admissionFee = fee.totalAmount ?? 0;
              feeDetails = fee.details ?? [];
              fineAmount = fee.fineAmount ?? 0;
              fineEndDate = fee.endDate ?? null;  // endDate = last day of no-fine window
            }


          }
        } catch {
          // No course/fee details available for this application — leave defaults as-is.
        }

        // Same rule as application_fee.tsx/dashboard.tsx/AppLayout.tsx: only
        // this combination skipped the application-fee page entirely, so
        // only this combination needs its checklist re-verified here.
        const isFeeExempt =
          isUsnUser &&
          degreeName.trim().toLowerCase() === "bachelor of science" &&
          registration?.academicYearDescription?.trim() === "2023-2024";
        setFeeExempt(isFeeExempt);

        // ── "All steps complete" gate — fee-exempt USN students only ───────
        // Non-exempt students (no USN, or USN but not B.Sc/2023-2024) already
        // passed this same checklist on the application-fee page before
        // reaching this one. Fee-exempt students skip that page entirely (no
        // application fee for them), so without this they could reach
        // admission-fee payment without finishing Education, Seat Type,
        // Photo/Signature, or Documents.
        if (isFeeExempt) {
          try {
            let isPG = false;
            if (registration?.degreeTypeName) {
              const s = String(registration.degreeTypeName).toLowerCase();
              isPG = s.includes("pg") || s.includes("post");
            }

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
            // Registration Number instead. seatTypes.length would always be
            // 0 for them, so check that field instead.
            const seatTypeDone = !!previousRegistrationNo?.trim();
            const degreeCourseDone = !!degreeId && !!courseId;
            const photoDone = !!(photoRecord?.photoUrl && photoRecord?.signatureUrl && photoRecord?.parentSignUrl);

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
            // isUsnUser is always true in this branch, so always append the USN-only docs.
            const usnDocs = await getLookupsByType("Document", "ONLY_USN").catch(() => []);
            const seen = new Set(requiredDocs.map((d) => d.id));
            requiredDocs = [
              ...requiredDocs,
              ...usnDocs
                .filter((l) => !seen.has(l.id))
                .map((l) => ({ id: l.id, documentName: l.name ?? "", triggerRule: l.type2 ?? "", triggerLabel: "" })),
            ];

            const uploadedNames = new Set(uploadedDocs.map((d) => d.documentName));
            const totalRequiredDocs = requiredDocs.length + (isPG ? 1 : 0);
            const doneRequiredDocs =
              requiredDocs.filter((d) => uploadedNames.has(d.documentName)).length +
              (isPG && uploadedNames.has(DEGREE_MARKS_DOC_NAME) ? 1 : 0);
            const documentsDone = totalRequiredDocs === 0 || doneRequiredDocs >= totalRequiredDocs;

            setChecklist([
              { key: "education", label: "Education details", done: educationDone, path: "/student/application" },
              { key: "degreeCourse", label: "Degree & Course selection", done: degreeCourseDone, path: "/student/application" },
              { key: "seatType", label: "Previous Registration Number", done: seatTypeDone, path: "/student/application" },
              { key: "photo", label: "Photo & Signature upload", done: photoDone, path: "/student/photos" },
              { key: "documents", label: "Document upload", done: documentsDone, path: "/student/documents" },
            ]);
          } catch (err) {
            console.error("[AdmissionFeePage] checklist computation failed:", err);
            // Fail safe: if completeness can't be determined, don't block a
            // student who has otherwise clearly finished everything — but do
            // log it so it can be investigated.
          }
        }

        // ── Rule-based extra admission-fee charges ──────────────────────
        // Resolved from the student's own application data (domicile, PG
        // in-service status) — not something the student selects here.
        let conditionalCharges: AdmissionFeeConditionalCharge[] = [];
        let conditionalFeeTotal = 0;
        if (isNonKarnataka || isPgInService) {
          try {
            const allCharges = await getConditionalCharges();
            conditionalCharges = allCharges.filter(
              (c) =>
                c.status &&
                ((isNonKarnataka && c.conditionCode === "NonKarnataka") ||
                  (isPgInService && c.conditionCode === "PgInService")),
            );
            conditionalFeeTotal = conditionalCharges.reduce(
              (s, c) => s + (c.amount ?? 0),
              0,
            );
          } catch {
            // Non-fatal — the fee page still works without these if this call fails.
          }
        }

        // ✅ Verification + paid fee receipts + manual fees
        try {
          const [verif, allFees, manualFees] = await Promise.allSettled([
            getApplicationVerificationByAppNo(appNo),
            getFeesByApplicationId(app.id),
            getFeeCollectionManualByAppNo(appNo),
          ]);

          if (verif.status === "fulfilled") {
            setVerificationStatus(verif.value?.verificationStatus ?? null);
            setInstallmentCount(verif.value?.installment ?? 0);
            setFeesEnabled(verif.value?.feesEnabled ?? false);
          }

          if (allFees.status === "fulfilled") {
            const admissionFeeTypes = [
              "admission fee",
              "admission fee - installment 1",
              "admission fee - installment 2",
            ];
            setPaidAdmFees(
              allFees.value.filter(
                (f) =>
                  (f.status ?? "").toLowerCase() === "success" &&
                  admissionFeeTypes.some((t) =>
                    (f.feeType ?? "").toLowerCase().includes(t),
                  ),
              ),
            );
          }

          if (manualFees.status === "fulfilled") {
            setManualAdmFees(manualFees.value);
          }
        } catch (err) {
          console.error("Verification/fees fetch failed:", err);
        }

        setInfo({
          applicationId: app.id,
          appNo,
          name: app.name,
          phone: app.phone ?? "—",
          email: app.email ?? "—",
          categoryName,
          nationalityName,
          degreeId,
          courseId,
          degreeName,
          courseName,
          feeName,
          admissionFee,
          feeDetails,
          fineAmount: fineAmount ?? 0,
          fineEndDate: fineEndDate ?? null,
          isNonKarnataka,
          isPgInService,
          conditionalCharges,
          conditionalFeeTotal,
        });
      } catch {
        showToast("Failed to load admission fee details.", "error");
      } finally {
        setFetching(false);
      }
    };

    load();
  }, []);

  /* ── PAY HANDLER ──────────────────────── */
  const handlePay = async (installment: 1 | 2) => {
    if (!info) return;

    const isInstMode = installmentCount === 2;
    // Fine only on installment 1 (or single payment); never on installment 2
    const lateFine = (isInstMode && installment === 2) ? 0 : effectiveLateFine;
    // Same convention as the late fine — rule-based charges apply to
    // installment 1 / the single payment only, never installment 2.
    const conditionalCharge =
      (isInstMode && installment === 2) ? 0 : conditionalFeeTotal;
    // Charge only what's actually still owed — if a manual/counter receipt
    // already covered part of this fee, this is the leftover, not the full
    // installment/admission amount again.
    const amount =
      (isInstMode
        ? installment === 1
          ? inst1BaseRemaining
          : inst2BaseRemaining
        : singleBaseRemaining) + lateFine + conditionalCharge;
    const platformFee =
      hasUsn && (!isInstMode || installment === 1) ? USN_PLATFORM_FEE : 0;

    setPayingInst(installment);

    try {
      const receiptNumber = await generateReceiptNumber();

      const uiFeeType = isInstMode
        ? installment === 1
          ? "Admission Fee - Installment 1"
          : "Admission Fee - Installment 2"
        : "Admission Fee";

      // 🔥 Easebuzz key (IMPORTANT)
      const paymentFeeType = "MGRDPU";

      await createFeeCollection({
        applicationId: info.applicationId,
        applicationNo: info.appNo,
        name: info.name,
        email: info.email === "—" ? undefined : info.email,
        mobile: info.phone === "—" ? undefined : info.phone,
        feeType: uiFeeType,
        degreeId: info.degreeId,
        courseId: info.courseId,
        amount,
        platformCharges: platformFee,
        receiptNumber,
      });

      // 🔥 Call Easebuzz instead of PhonePe
      const { paymentUrl } = await createPaymentLink({
        receiptNo: receiptNumber,
        applicationId: info.applicationId,
        name: info.name,
        email: info.email === "—" ? "" : info.email,
        phone: info.phone === "—" ? "" : info.phone,
        collegePayable: amount,
        serviceCharge: platformFee,
        feeType: paymentFeeType,
      });

      // Optional: store for receipt page
      localStorage.setItem("easebuzz_receipt", receiptNumber);

      // 🔥 Redirect to Easebuzz page
      window.location.href = paymentUrl;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;

      showToast(msg ?? "Failed to initiate payment.", "error");
      setPayingInst(null);
    }
  };

  /* ── DERIVED ──────────────────────────── */
  const isAccepted = verificationStatus === "Accepted";
  const isCertDegree = studentDegreeId === CERTIFICATION_DEGREE_ID;
  // Certificate Course + PG students have fee payment gated on admin explicitly enabling it.
  const isFeeGatedDegree = !!studentDegreeType2 && FEE_ENABLED_DEGREE_TYPE2.has(studentDegreeType2);
  const canPayFee = isAccepted && (!isFeeGatedDegree || feesEnabled);
  // For fee-gated students without feesEnabled, treat as non-installment so the
  // "fees not yet enabled" notice renders instead of the installment pay buttons.
  const isInstallment = canPayFee && installmentCount === 2;
  const inst1Details = info?.feeDetails.filter((d) => d.installment1) ?? [];
  const inst2Details = info?.feeDetails.filter((d) => d.installment2) ?? [];
  const inst1Total = inst1Details.reduce(
    (s, d) =>
      s +
      (d.installment1Amount && d.installment1Amount > 0
        ? d.installment1Amount
        : (d.amount ?? 0)),
    0,
  );
  const inst2Total = inst2Details.reduce(
    (s, d) =>
      s +
      (d.installment2Amount && d.installment2Amount > 0
        ? d.installment2Amount
        : (d.amount ?? 0)),
    0,
  );

  // Fine is active if today is strictly after fineEndDate (the last no-fine day)
  const effectiveLateFine = (() => {
    if (!info?.fineAmount || info.fineAmount <= 0) return 0;
    if (!info.fineEndDate) return info.fineAmount; // no window set → always active
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(info.fineEndDate);
    end.setHours(0, 0, 0, 0);
    return today > end ? info.fineAmount : 0;
  })();

  const conditionalFeeTotal = info?.conditionalFeeTotal ?? 0;
  const conditionalCharges = info?.conditionalCharges ?? [];

  const inst1Receipt =
    paidAdmFees.find((f) => (f.feeType ?? "").includes("Installment 1")) ??
    null;
  const inst2Receipt =
    paidAdmFees.find((f) => (f.feeType ?? "").includes("Installment 2")) ??
    null;
  const singleReceipt =
    paidAdmFees.find(
      (f) => (f.feeType ?? "").toLowerCase() === "admission fee",
    ) ??
    paidAdmFees.find((f) =>
      (f.feeType ?? "").toLowerCase().includes("admission fee"),
    ) ??
    null;

  // Amount actually collected toward each fee — online (paidAdmFees) plus
  // manual/counter receipts (manualAdmFees) generated from the Receipt Entry
  // page — matched by name/type and SUMMED, rather than just checking
  // whether a record exists. This is what makes a manual receipt reflect
  // here, and what lets a partial manual payment (e.g. ₹8,000 of a ₹20,000
  // installment) show up as partially paid instead of either fully paid or
  // invisible.
  // NOTE: online records are assumed to carry the paid amount in `.amount`
  // (matching the field name used when creating them via createFeeCollection);
  // adjust `paymentAmount` below if FeeCollectionResponse names it differently.
  const paymentAmount = (f: { amount?: number; feeAmount?: number }) =>
    f.amount ?? f.feeAmount ?? 0;

  const inst1PaidAmount =
    paidAdmFees
      .filter((f) => (f.feeType ?? "").includes("Installment 1"))
      .reduce((s, f) => s + paymentAmount(f), 0) +
    manualAdmFees
      .filter((f) => (f.feeName ?? "").toLowerCase().includes("installment 1"))
      .reduce((s, f) => s + (f.feeAmount ?? 0), 0);

  const inst2PaidAmount =
    paidAdmFees
      .filter((f) => (f.feeType ?? "").includes("Installment 2"))
      .reduce((s, f) => s + paymentAmount(f), 0) +
    manualAdmFees
      .filter((f) => (f.feeName ?? "").toLowerCase().includes("installment 2"))
      .reduce((s, f) => s + (f.feeAmount ?? 0), 0);

  const singlePaidAmount =
    paidAdmFees
      .filter((f) => (f.feeType ?? "").toLowerCase() === "admission fee")
      .reduce((s, f) => s + paymentAmount(f), 0) +
    manualAdmFees
      // Exact match only — "Admission Fee - Installment 1/2" must NOT count
      // toward the single/full-payment total.
      .filter((f) => (f.feeName ?? "").trim().toLowerCase() === "admission fee")
      .reduce((s, f) => s + (f.feeAmount ?? 0), 0);

  // "Due" includes the late fine / conditional charge / platform fee that
  // show in the button labels below, so remaining reflects the true balance.
  const inst1Due = inst1Total + effectiveLateFine + conditionalFeeTotal;
  const inst2Due = inst2Total;
  const singleDue =
    (info?.admissionFee ?? 0) +
    effectiveLateFine +
    conditionalFeeTotal +
    (hasUsn ? USN_PLATFORM_FEE : 0);

  const inst1Remaining = Math.max(inst1Due - inst1PaidAmount, 0);
  const inst2Remaining = Math.max(inst2Due - inst2PaidAmount, 0);
  const singleRemaining = Math.max(singleDue - singlePaidAmount, 0);

  // Base (fine/platform-fee-excluded) remaining, used to decide what the
  // "Pay" button should charge online — so paying online after a partial
  // manual payment only collects what's left, not the full amount again.
  const inst1BaseRemaining = Math.max(inst1Total - inst1PaidAmount, 0);
  const inst2BaseRemaining = Math.max(inst2Total - inst2PaidAmount, 0);
  const singleBaseRemaining = Math.max((info?.admissionFee ?? 0) - singlePaidAmount, 0);

  const inst1Paid = inst1Due > 0 && inst1Remaining <= 0;
  const inst2Paid = inst2Due > 0 && inst2Remaining <= 0;
  const singlePaid = singleDue > 0 && singleRemaining <= 0;
  const inst1PartiallyPaid = !inst1Paid && inst1PaidAmount > 0;
  const inst2PartiallyPaid = !inst2Paid && inst2PaidAmount > 0;
  const singlePartiallyPaid = !singlePaid && singlePaidAmount > 0;

  // Paid if the full amount has been collected across online + manual
  // records — no longer just "does any manual admission-fee record exist",
  // which used to also match partial installment receipts by accident.
  const admFeePaidOverall = singlePaid;

  const toReceiptUrl = (r: FeeCollectionResponse) =>
    `/student/fee-receipt?receipt=${r.receiptNumber}`;

  /* ── UI ───────────────────────────────── */
  if (fetching) {
    return (
      <AppLayout pageTitle="Admission Fee">
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">
          Loading...
        </div>
      </AppLayout>
    );
  }

  if (!info) {
    return (
      <AppLayout pageTitle="Admission Fee">
        <div className="text-center text-gray-400">No application found.</div>
      </AppLayout>
    );
  }

  const pendingSteps = checklist.filter((s) => !s.done);

  if (feeExempt && pendingSteps.length > 0) {
    return (
      <AppLayout pageTitle="Admission Fee">
        <div className="flex items-center justify-center min-h-[60vh] px-4 py-10">
          <div
            data-testid="admission-fee-locked"
            className="flex flex-col items-center w-full max-w-2xl p-8 text-center bg-white border shadow-sm sm:p-10 rounded-xl border-border"
          >
            <div className="flex items-center justify-center mb-4 rounded-full w-14 h-14 bg-amber-100">
              <Lock className="w-7 h-7 text-amber-600" />
            </div>
            <h2 className="text-base font-bold text-text">Admission Fee Not Yet Unlocked</h2>
            <p className="max-w-lg mt-2 text-sm font-medium leading-relaxed text-gray-600">
              Admission fee payment is enabled only after every step below is complete. Finish the
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

  return (
    <AppLayout pageTitle="Admission Fee">
      {toast && (
        <div className="fixed z-50 top-5 right-5">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}

      <div data-testid="admission-fee-page" className="pb-8 space-y-4">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-text">
            Admission Fee Payment
          </h1>
          <p className="text-sm text-gray-500">
            Complete your admission fee to finalise your enrollment.
          </p>
        </div>

        {/* VERIFICATION STATUS BANNER */}
        {isAccepted ? (
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-emerald-50 border-emerald-200 text-emerald-700">
            <ShieldCheck size={16} className="shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                Application Verified &amp; Accepted
              </p>
              <p className="text-xs mt-0.5">
                Your documents have been verified. You may proceed with fee
                payment.
              </p>
            </div>
          </div>
        ) : (
          <div
            className={`flex items-center gap-3 p-4 rounded-lg border ${verificationStatus === "Rejected"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
              }`}
          >
            <Lock size={16} className="shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {verificationStatus === "Rejected"
                  ? "Application Rejected"
                  : "Awaiting Verification"}
              </p>
              <p className="text-xs mt-0.5">
                {verificationStatus === "Rejected"
                  ? "Your application has been rejected. Please contact the admissions office."
                  : "Payment will be enabled once your documents are verified and accepted."}
              </p>
            </div>
          </div>
        )}

        {/* STUDENT INFO */}
        <div className="p-5 space-y-4 bg-white border rounded-lg">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <User size={16} /> Student Information
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <InfoRow label="Application No." value={info.appNo} />
            <InfoRow label="Full Name" value={info.name} />
            <InfoRow label="Phone" value={info.phone} />
            <InfoRow label="Email" value={info.email} />
            <InfoRow label="Category" value={info.categoryName} />
            <InfoRow label="Nationality" value={info.nationalityName} />
            {prevRegNoDisplay && (
              <InfoRow
                label="Previous Registration No."
                value={prevRegNoDisplay}
              />
            )}
            {(isCertDegree || batchDesc) && (
              <InfoRow
                label="Batch"
                value={
                  isCertDegree
                    ? "Batch 2"
                    : batchYearLabel
                      ? `${batchDesc} (${batchYearLabel})`
                      : batchDesc!
                }
              />
            )}
          </div>
        </div>

        {/* COURSE INFO */}
        <div className="p-5 space-y-4 bg-white border rounded-lg">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <BookOpen size={16} /> Enrollment Details
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <InfoRow label="Degree" value={info.degreeName} />
            <InfoRow label="Course" value={info.courseName} />
          </div>
        </div>

        {/* FEE BREAKDOWN */}
        <div className="p-5 space-y-4 bg-white border rounded-lg">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Layers size={16} />
            Fee Breakdown
            {info.feeName !== "—" && (
              <span className="ml-1 text-xs font-normal text-gray-400">
                ({info.feeName})
              </span>
            )}
          </div>

          {conditionalFeeTotal > 0 && (
            <div className="flex items-start gap-2 p-3 text-xs text-indigo-700 border border-indigo-200 rounded-lg bg-indigo-50">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                An additional charge of ₹{conditionalFeeTotal.toLocaleString()} applies to your
                admission fee because you are{" "}
                {[
                  info.isNonKarnataka && "a non-Karnataka domicile applicant",
                  info.isPgInService && "a PG in-service candidate",
                ]
                  .filter(Boolean)
                  .join(" and ")}
                .
              </span>
            </div>
          )}

          {info.feeDetails.length > 0 ? (
            isInstallment ? (
              /* ── Segregated installment tables ── */
              <div className="space-y-4">
                {/* Installment 1 particulars */}
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide uppercase text-primary">
                    Installment 1 Particulars
                  </p>
                  {inst1Details.length > 0 || conditionalFeeTotal > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b">
                          <th className="pb-2 font-medium text-left">
                            Particular
                          </th>
                          <th className="pb-2 font-medium text-right">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {inst1Details.map((d, i) => (
                          <tr key={d.id ?? i}>
                            <td className="py-2 text-gray-700">
                              {d.particularName ?? "—"}
                            </td>
                            <td className="py-2 text-right text-gray-700">
                              ₹
                              {(d.installment1Amount && d.installment1Amount > 0
                                ? d.installment1Amount
                                : (d.amount ?? 0)
                              ).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {effectiveLateFine > 0 && (
                          <tr>
                            <td className="py-2 font-medium text-amber-700">
                              Late Fine
                            </td>
                            <td className="py-2 font-medium text-right text-amber-700">
                              ₹{effectiveLateFine.toLocaleString()}
                            </td>
                          </tr>
                        )}
                        {conditionalCharges.map((c) => (
                          <tr key={c.id ?? c.particularName}>
                            <td className="py-2">
                              <span className="font-medium text-indigo-700">
                                {c.particularName}
                              </span>
                            </td>
                            <td className="py-2 font-medium text-right text-indigo-700">
                              ₹{(c.amount ?? 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold border-t">
                          <td className="pt-2 text-gray-800">
                            Installment 1 Total
                          </td>
                          <td className="pt-2 text-right text-primary">
                            ₹{(inst1Total + effectiveLateFine + conditionalFeeTotal).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <p className="text-xs text-gray-400">
                      No particulars assigned to Installment 1.
                    </p>
                  )}
                </div>

                {/* Installment 2 particulars */}
                <div className="pt-4 border-t">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Installment 2 Particulars
                  </p>
                  {inst2Details.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b">
                          <th className="pb-2 font-medium text-left">
                            Particular
                          </th>
                          <th className="pb-2 font-medium text-right">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {inst2Details.map((d, i) => (
                          <tr key={d.id ?? i}>
                            <td className="py-2 text-gray-700">
                              {d.particularName ?? "—"}
                            </td>
                            <td className="py-2 text-right text-gray-700">
                              ₹
                              {(d.installment2Amount && d.installment2Amount > 0
                                ? d.installment2Amount
                                : (d.amount ?? 0)
                              ).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold border-t">
                          <td className="pt-2 text-gray-800">
                            Installment 2 Total
                          </td>
                          <td className="pt-2 text-right text-gray-700">
                            ₹{inst2Total.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <p className="text-xs text-gray-400">
                      No particulars assigned to Installment 2.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* ── Full table (single payment) ── */
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b">
                    <th className="pb-2 font-medium text-left">Particular</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {info.feeDetails.map((d, i) => (
                    <tr key={d.id ?? i}>
                      <td className="py-2 text-gray-700">
                        {d.particularName ?? "—"}
                      </td>
                      <td className="py-2 text-right text-gray-700">
                        ₹{(d.amount ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {effectiveLateFine > 0 && (
                    <tr>
                      <td className="py-2 font-medium text-amber-700">
                        Late Fine
                      </td>
                      <td className="py-2 font-medium text-right text-amber-700">
                        ₹{effectiveLateFine.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  {conditionalCharges.map((c) => (
                    <tr key={c.id ?? c.particularName}>
                      <td className="py-2">
                        <span className="font-medium text-indigo-700">
                          {c.particularName}
                        </span>
                      </td>
                      <td className="py-2 font-medium text-right text-indigo-700">
                        ₹{(c.amount ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {hasUsn && (
                    <tr>
                      <td className="py-2 text-gray-500">Platform Charges</td>
                      <td className="py-2 text-right text-gray-500">
                        ₹{USN_PLATFORM_FEE.toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="font-semibold border-t">
                    <td className="pt-3 text-gray-800">Total</td>
                    <td className="pt-3 text-base text-right text-primary">
                      ₹
                      {(
                        info.admissionFee +
                        effectiveLateFine +
                        conditionalFeeTotal +
                        (hasUsn ? USN_PLATFORM_FEE : 0)
                      ).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Admission Fee</span>
                <span className="text-xl font-bold text-primary">
                  ₹{info.admissionFee.toLocaleString()}
                </span>
              </div>
              {conditionalCharges.map((c) => (
                <div key={c.id ?? c.particularName} className="flex items-center justify-between text-sm">
                  <span className="text-indigo-700">{c.particularName}</span>
                  <span className="font-medium text-indigo-700">
                    ₹{(c.amount ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── INSTALLMENT MODE ── */}
        {isInstallment ? (
          <div className="space-y-3">
            <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
              Installment Plan · Inst 1: ₹
              {(inst1Total + effectiveLateFine + conditionalFeeTotal).toLocaleString()} · Inst 2: ₹
              {inst2Total.toLocaleString()}
            </p>

            {/* Installment 1 */}
            <div
              data-testid="installment-1-card"
              className={`bg-white border rounded-lg p-4 ${inst1Paid
                ? "border-emerald-200 bg-emerald-50/40"
                : inst1PartiallyPaid
                  ? "border-amber-200 bg-amber-50/40"
                  : ""
                }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${inst1Paid
                      ? "bg-emerald-100 text-emerald-700"
                      : inst1PartiallyPaid
                        ? "bg-amber-100 text-amber-700"
                        : "bg-primary/10 text-primary"
                      }`}
                  >
                    {inst1Paid ? <CheckCircle size={16} /> : "1"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {inst1Paid
                        ? "Installment 1 — Paid"
                        : inst1PartiallyPaid
                          ? "Installment 1 — Partially Paid"
                          : "Installment 1"}
                    </p>
                    <p className="text-xs text-gray-400">
                      ₹{(inst1Total + effectiveLateFine + conditionalFeeTotal).toLocaleString()}
                      {effectiveLateFine > 0 && (
                        <span className="ml-1 text-amber-600">
                          (incl. ₹{effectiveLateFine} late fine)
                        </span>
                      )}
                      {conditionalFeeTotal > 0 && (
                        <span className="ml-1 text-indigo-600">
                          (incl. ₹{conditionalFeeTotal} additional charge)
                        </span>
                      )}
                    </p>
                    {inst1PartiallyPaid && (
                      <p className="mt-0.5 text-xs font-medium text-amber-600">
                        ₹{inst1PaidAmount.toLocaleString()} paid · ₹{inst1Remaining.toLocaleString()} remaining
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {inst1Paid ? (
                    inst1Receipt ? (
                      <a href={toReceiptUrl(inst1Receipt)}>
                        <Button variant="outline">
                          <Download size={15} />
                          Download Receipt
                        </Button>
                      </a>
                    ) : (
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          <Landmark size={12} />
                          Paid at University
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate("/student/manual-fee-receipt")}
                          className="inline-flex items-center gap-1 text-xs font-medium group text-primary hover:text-primary/80"
                        >
                          <Receipt size={13} />
                          View in My Receipts
                          <ArrowRight
                            size={12}
                            className="transition-transform group-hover:translate-x-0.5"
                          />
                        </button>
                      </div>
                    )
                  ) : (
                    <Button
                      onClick={() => handlePay(1)}
                      disabled={!!payingInst}
                    >
                      <CreditCard size={15} />
                      {payingInst === 1
                        ? "Processing…"
                        : `Pay ₹${inst1Remaining.toLocaleString()}${inst1PartiallyPaid ? " remaining" : ""}`}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Installment 2 */}
            <div
              data-testid="installment-2-card"
              className={`bg-white border rounded-lg p-4 ${inst2Paid
                ? "border-emerald-200 bg-emerald-50/40"
                : inst2PartiallyPaid
                  ? "border-amber-200 bg-amber-50/40"
                  : !inst1Paid
                    ? "opacity-60"
                    : ""
                }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${inst2Paid
                      ? "bg-emerald-100 text-emerald-700"
                      : inst2PartiallyPaid
                        ? "bg-amber-100 text-amber-700"
                        : inst1Paid
                          ? "bg-primary/10 text-primary"
                          : "bg-gray-100 text-gray-400"
                      }`}
                  >
                    {inst2Paid ? (
                      <CheckCircle size={16} />
                    ) : inst1Paid ? (
                      "2"
                    ) : (
                      <Lock size={14} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {inst2Paid
                        ? "Installment 2 — Paid"
                        : inst2PartiallyPaid
                          ? "Installment 2 — Partially Paid"
                          : "Installment 2"}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-400">
                        ₹{inst2Total.toLocaleString()}
                      </p>
                      {!inst1Paid && !inst2Paid && !inst2PartiallyPaid && (
                        <span className="text-[10px] text-gray-400">
                          Pay Installment 1 first
                        </span>
                      )}
                    </div>
                    {inst2PartiallyPaid && (
                      <p className="mt-0.5 text-xs font-medium text-amber-600">
                        ₹{inst2PaidAmount.toLocaleString()} paid · ₹{inst2Remaining.toLocaleString()} remaining
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {inst2Paid ? (
                    inst2Receipt ? (
                      <a href={toReceiptUrl(inst2Receipt)}>
                        <Button variant="outline">
                          <Download size={15} />
                          Download Receipt
                        </Button>
                      </a>
                    ) : (
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          <Landmark size={12} />
                          Paid at University
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate("/student/manual-fee-receipt")}
                          className="inline-flex items-center gap-1 text-xs font-medium group text-primary hover:text-primary/80"
                        >
                          <Receipt size={13} />
                          View in My Receipts
                          <ArrowRight
                            size={12}
                            className="transition-transform group-hover:translate-x-0.5"
                          />
                        </button>
                      </div>
                    )
                  ) : (
                    <Button
                      onClick={() => handlePay(2)}
                      disabled={!!payingInst || !inst1Paid}
                    >
                      <CreditCard size={15} />
                      {payingInst === 2
                        ? "Processing…"
                        : `Pay ₹${inst2Remaining.toLocaleString()}${inst2PartiallyPaid ? " remaining" : ""}`}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : /* ── SINGLE PAYMENT ── */
          admFeePaidOverall ? (
            <div className="flex items-center justify-between p-4 border rounded-lg border-emerald-200 bg-emerald-50/40">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Admission Fee — Paid
                  </p>
                  <p className="text-xs text-gray-400">
                    ₹{info.admissionFee.toLocaleString()}
                  </p>
                </div>
              </div>
              {singleReceipt ? (
                <a href={toReceiptUrl(singleReceipt)}>
                  <Button variant="outline">
                    <Download size={15} />
                    Download Receipt
                  </Button>
                </a>
              ) : (
                <div className="flex flex-col items-end gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    <Landmark size={12} />
                    Paid at University
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/student/manual-fee-receipt")}
                    className="inline-flex items-center gap-1 text-xs font-medium group text-primary hover:text-primary/80"
                  >
                    <Receipt size={13} />
                    View in My Receipts
                    <ArrowRight
                      size={12}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                </div>
              )}
            </div>
          ) : isFeeGatedDegree && isAccepted && !feesEnabled ? (
            <div className="flex items-center gap-3 p-4 text-blue-700 border border-blue-200 rounded-lg bg-blue-50">
              <Lock size={16} className="shrink-0" />
              <p className="text-sm">
                Your admission fee payment will be activated by the admissions office. Please check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {singlePartiallyPaid && (
                <div className="flex items-center justify-between p-3 text-sm border rounded-lg border-amber-200 bg-amber-50/40">
                  <span className="font-medium text-amber-700">
                    ₹{singlePaidAmount.toLocaleString()} already paid
                  </span>
                  <span className="font-semibold text-amber-700">
                    ₹{singleRemaining.toLocaleString()} remaining
                  </span>
                </div>
              )}
              <Button
                data-testid="btn-pay-single"
                onClick={() => handlePay(1)}
                disabled={!!payingInst || !canPayFee}
                className="flex items-center justify-center w-full gap-2"
              >
                <CreditCard size={18} />
                {payingInst
                  ? "Processing…"
                  : `Pay ₹${singleRemaining.toLocaleString()}${singlePartiallyPaid ? " remaining" : ""}`}
              </Button>
            </div>
          )}

        {/* ── ADMIT CARD ── */}
        {admFeePaidOverall && (
          <div className="flex items-center justify-between p-4 border rounded-lg border-primary/30 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                <Download size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Admit Card
                </p>
                <p className="text-xs text-gray-400">
                  Your admit card is ready to download.
                </p>
              </div>
            </div>
            <a href={`/student/admit-card?appNo=${info.appNo}`}>
              <Button variant="outline">
                <Download size={15} />
                Download Admit Card
              </Button>
            </a>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/* ─── Helper ───────────────────────────── */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}