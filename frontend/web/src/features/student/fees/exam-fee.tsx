import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Clock, ShieldCheck, User, BookOpen, CheckCircle, XCircle, Lock, AlertTriangle } from "lucide-react";
import Button from "../../../components/ui/Button";
import AppLayout from "../../../components/layouts/AppLayout";
import Toast from "../../../components/ui/Toast";
import { getRegistrationByUsername } from "../../../services/registrationService";
import { getExamApplications, type ExamApplication } from "../../../services/examApplicationService";
import { getDegreeById } from "../../../services/degreeService";
import { getCourseById } from "../../../services/courseService";
import { generateReceiptNumber } from "../../../services/receiptSequenceService";
import { createFeeCollection, getFeesByApplicationId, type FeeCollectionResponse } from "../../../services/feeCollectionService";
import { createPaymentLink } from "../../../services/easebuzzService";
import { getExamFees, type ExamFee } from "../../../services/examFeeService";

type FeeInfo = {
  applicationId: string;
  appNo: string;
  name: string;
  phone: string;
  email: string;
  degreeName: string;
  courseName: string;
};

function isFineActive(fee: { endDate: string }): boolean {
  if (!fee.endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(fee.endDate);
  end.setHours(0, 0, 0, 0);
  if (Number.isNaN(end.getTime())) return false;
  return today.getTime() > end.getTime();
}

function pickApplicableFee(
  fees: ExamFee[],
  degreeId: string,
  courseId: string,
  academicYearId: string
): ExamFee | null {
  const candidates = fees.filter(
    (f) =>
      f.degreeId === degreeId &&
      f.courseId === courseId &&
      f.academicYearId === academicYearId &&
      f.status
  );
  if (candidates.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const withinWindow = candidates.find((f) => {
    const start = new Date(f.startDate);
    const end = new Date(f.fineEndDate || f.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return today.getTime() >= start.getTime() && today.getTime() <= end.getTime();
  });
  if (withinWindow) return withinWindow;

  return [...candidates].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  )[0];
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? "text-primary" : "text-text"}`}>{value}</p>
    </div>
  );
}

function ApprovalBadge({ label, approved }: { label: string; approved: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
      approved
        ? "bg-green-50 border-green-200 text-green-700"
        : "bg-gray-50 border-gray-200 text-gray-500"
    }`}>
      {approved
        ? <CheckCircle size={13} className="text-green-500" />
        : <XCircle size={13} className="text-gray-400" />}
      {label}
    </div>
  );
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function ExamFeePaymentPage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") ?? "";

  const [info, setInfo] = useState<FeeInfo | null>(null);
  const [examApp, setExamApp] = useState<ExamApplication | null>(null);
  const [paidFee, setPaidFee] = useState<FeeCollectionResponse | null>(null);
  const [feeConfig, setFeeConfig] = useState<ExamFee | null>(null);
  const [feeConfigMissing, setFeeConfigMissing] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Amounts come entirely from the matched exam fee master record — nothing hardcoded.
  const fineActive = feeConfig ? isFineActive(feeConfig) : false;
  const examFeeAmount = feeConfig?.examFeeAmount ?? 0;
  const platformCharges = feeConfig?.platformCharges ?? 0;
  const fineAmount = feeConfig && fineActive ? feeConfig.fineAmount : 0;
  const totalPayable = examFeeAmount + platformCharges + fineAmount;

  const handleCreatePayment = async () => {
    if (!info || !feeConfig) return;

    setPaying(true);

    try {
      const receiptNumber = await generateReceiptNumber();

      // UI label (for your DB)
      const uiFeeType = "Exam Fees";

      // Payment system key (IMPORTANT)
      const paymentFeeType = "MGRDPU";

      await createFeeCollection({
        applicationId:   info.applicationId,
        applicationNo:   info.appNo,
        name:            info.name,
        email:           info.email === "—" ? undefined : info.email,
        mobile:          info.phone === "—" ? undefined : info.phone,
        feeType:         uiFeeType, // keep human-readable here
        amount:          examFeeAmount + fineAmount,
        platformCharges: platformCharges,
        receiptNumber,
      });

      const { paymentUrl } = await createPaymentLink({
        receiptNo:      receiptNumber,
        applicationId:  info.applicationId,
        name:           info.name,
        email:          info.email === "—" ? "" : info.email,
        phone:          info.phone === "—" ? "" : info.phone,
        collegePayable: examFeeAmount + fineAmount,
        serviceCharge:  platformCharges,
        feeType:        paymentFeeType, // 🔥 REQUIRED
      });

      localStorage.setItem("easebuzz_receipt", receiptNumber);

      window.location.href = paymentUrl;

    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

      showToast(msg ?? "Failed to initiate payment.", "error");
      setPaying(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [reg, apps] = await Promise.all([
          getRegistrationByUsername(username).catch(() => null),
          getExamApplications(),
        ]);

        if (!reg) return;

        const found = (apps as ExamApplication[]).find(
          (a) =>
            a.regisNumber === reg.usnNo ||
            a.name?.toLowerCase() === (reg.name ?? "").toLowerCase()
        );
        if (!found) return;
        setExamApp(found);

        // Only build payment info once the application is fully approved
        if (!(found.academicApproval && found.attendanceApproval && found.otherApproval)) {
          return;
        }

        // Check if exam fee already paid
        try {
          const fees = await getFeesByApplicationId(found.id);
          const paid = fees.find(
            (f) => f.feeType === "Exam Fees" && f.status === "SUCCESS"
          );
          if (paid) {
            setPaidFee(paid);
            return;
          }
        } catch { /* non-critical — proceed to payment UI */ }

        let degreeName = "—";
        let courseName = "—";
        try {
          const [degree, course] = await Promise.all([
            getDegreeById(found.degreeId),
            getCourseById(found.courseId),
          ]);
          degreeName = degree.degreeName;
          courseName = course.name;
        } catch { /* optional */ }

        // Fetch the exam fee master rule that applies to this student's degree + course
        try {
          const allFees = await getExamFees();
          const applicable = pickApplicableFee(allFees, found.degreeId, found.courseId, found.academicYearId);
          if (applicable) {
            setFeeConfig(applicable);
          } else {
            setFeeConfigMissing(true);
          }
        } catch {
          setFeeConfigMissing(true);
        }

        setInfo({
          applicationId: found.id,
          appNo: found.applicationNo,
          name: found.name,
          phone: found.mobile ?? "—",
          email: found.email ?? "—",
          degreeName,
          courseName,
        });
      } catch {
        showToast("Failed to load exam application details.", "error");
      } finally {
        setFetching(false);
      }
    };

    load();
  }, [username]);

  if (fetching) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-sm text-gray-400 animate-pulse">Loading payment details…</p>
        </div>
      </AppLayout>
    );
  }

  /* ── No exam application submitted yet ── */
  if (!examApp) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-sm text-gray-400">No exam application found.</p>
        </div>
      </AppLayout>
    );
  }

  /* ── Already paid ── */
  if (paidFee) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center max-w-md gap-6 px-4 py-16 mx-auto text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100">
            <CheckCircle className="w-9 h-9 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text">Fee Already Paid</h2>
            <p className="mt-1 text-sm text-gray-400">
              Your exam fee has been successfully paid.
            </p>
          </div>
          <div className="w-full p-4 space-y-2 text-sm text-left border bg-surface border-border rounded-xl">
            <div className="flex justify-between">
              <span className="text-gray-400">Receipt No.</span>
              <span className="font-mono font-semibold text-primary">{paidFee.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount Paid</span>
              <span className="font-semibold text-text">₹{(paidFee.paidAmount || paidFee.amount).toLocaleString("en-IN")}</span>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => navigate(`/student/fee-receipt?receipt=${paidFee.receiptNumber}`)}
          >
            View Receipt
          </Button>
        </div>
      </AppLayout>
    );
  }

  /* ── Not yet fully approved ── */
  const fullyApproved = examApp.academicApproval && examApp.attendanceApproval && examApp.otherApproval;
  if (!fullyApproved || !info) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center max-w-md gap-6 px-4 py-16 mx-auto text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text">Approval Pending</h2>
            <p className="mt-1 text-sm text-gray-400">
              Exam fee payment unlocks once all approvals are complete.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ApprovalBadge label="Academic Approval" approved={examApp.academicApproval} />
            <ApprovalBadge label="Attendance Approval" approved={examApp.attendanceApproval} />
            <ApprovalBadge label="Fee No-Dues" approved={examApp.otherApproval} />
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ── No exam fee configured for this degree/course yet ── */
  if (feeConfigMissing || !feeConfig) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center max-w-md gap-6 px-4 py-16 mx-auto text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text">Exam Fee Not Set Up Yet</h2>
            <p className="mt-1 text-sm text-gray-400">
              The exam fee for your degree and course hasn't been configured yet. Please check back later or contact the exam cell.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div data-testid="exam-fee-page" className="max-w-2xl px-4 py-8 mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text">Exam Fee Payment</h1>
          <p className="mt-1 text-sm text-gray-400">Review your details and complete the payment.</p>
        </div>

        {/* Applicant Details */}
        <div className="p-5 space-y-4 border bg-surface border-border rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-text">Applicant Information</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Application No." value={info.appNo} highlight />
            <InfoRow label="Name" value={info.name} />
            <InfoRow label="Phone" value={info.phone} />
            <InfoRow label="Email" value={info.email} />
          </div>
        </div>

        {/* Course Details */}
        <div className="p-5 space-y-4 border bg-surface border-border rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-text">Course Details</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Degree" value={info.degreeName} />
            <InfoRow label="Course" value={info.courseName} />
          </div>
        </div>

        {/* Approval Status */}
        <div className="p-5 space-y-3 border bg-surface border-border rounded-xl">
          <h2 className="text-sm font-semibold text-text">Approval Status</h2>
          <div className="flex flex-wrap gap-2">
            <ApprovalBadge label="Academic Approval" approved={examApp.academicApproval} />
            <ApprovalBadge label="Attendance Approval" approved={examApp.attendanceApproval} />
            <ApprovalBadge label="Fee No-Dues" approved={examApp.otherApproval} />
          </div>
        </div>

        {/* Fee Summary */}
        <div className="p-5 space-y-3 border bg-surface border-border rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-text">Fee Breakdown</h2>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Exam Fee</span>
            <span className="font-medium text-text">₹{examFeeAmount.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Platform Fee</span>
            <span className="font-medium text-text">₹{platformCharges.toLocaleString("en-IN")}</span>
          </div>
          {fineActive ? (
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-amber-600">Late Fine</span>
              <span className="font-medium text-amber-600">₹{feeConfig.fineAmount.toLocaleString("en-IN")}</span>
            </div>
          ) : (
            feeConfig.fineAmount > 0 && (
              <div className="flex items-start gap-2 px-3 py-2 text-xs text-blue-800 border border-blue-100 rounded-lg bg-blue-50">
                <AlertTriangle size={13} className="text-blue-700 mt-0.5 shrink-0" />
                <span>
                  No late fine yet. Pay by{" "}
                  <span className="font-semibold">
                    {new Date(feeConfig.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>{" "}
                  to avoid a ₹{feeConfig.fineAmount.toLocaleString("en-IN")} fine.
                </span>
              </div>
            )
          )}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-sm font-semibold text-text">Total Payable</span>
            <span className="text-xl font-bold text-primary">₹{totalPayable.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-500" /> Secure Payment</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-yellow-500" /> Instant Confirmation</span>
        </div>

        {/* Pay Button */}
        <Button
          data-testid="btn-pay"
          className="w-full"
          disabled={paying}
          onClick={handleCreatePayment}
        >
          {paying ? "Processing…" : `Pay ₹${totalPayable.toLocaleString("en-IN")}`}
        </Button>
      </div>
    </AppLayout>
  );
}