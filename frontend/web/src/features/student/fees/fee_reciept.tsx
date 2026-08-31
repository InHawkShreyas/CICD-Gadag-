import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Printer, CheckCircle, XCircle, Receipt, ArrowLeft, AlertTriangle } from "lucide-react";
import AppLayout from "../../../components/layouts/AppLayout";
import Button from "../../../components/ui/Button";
import Loader from "../../../components/ui/Loader";
import {
  getFeesByApplicationId,
  getFeeByReceipt,
  type FeeCollectionResponse,
} from "../../../services/feeCollectionService";
import Barcode from "react-barcode";
import { getMyFullApplication, getFullApplicationByAppNo } from "../../../services/applicationQueryService";
import { getCourseDetailsByApplicationId } from "../../../services/applicationCourseDetailService";
import { getFeeByFilters, type AdmissionFeeStructureDetail } from "../../../services/admissionFeeStructureService";
import { getLookupsByType } from "../../../services/lookupService";
import { getDegreeById } from "../../../services/degreeService";
import { getCourseById } from "../../../services/courseService";
import { getAcademicYears } from "../../../services/academicYearService";
const APPLICATION_FEE_ROUTE = "/student/application-fee";
const ADMISSION_FEE_ROUTE = "/student/admission-fee";

export default function FeeReceiptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const receiptParam = searchParams.get("receipt");

  const [fee, setFee] = useState<FeeCollectionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [particulars, setParticulars] = useState<AdmissionFeeStructureDetail[]>([]);
  const [degreeName, setDegreeName] = useState<string>("");
  const [courseName, setCourseName] = useState<string>("");
  const [prevRegNo, setPrevRegNo] = useState<string | null>(null);
  const [academicYearDesc, setAcademicYearDesc] = useState<string | null>(null);
  const [batchYearLabel, setBatchYearLabel] = useState<string | null>(null);
  const [isCertificateCourse, setIsCertificateCourse] = useState<boolean>(false);
  const [batchTypeLabel, setBatchTypeLabel] = useState<string | null>(null);
  // Other degree/course rows on this same application that still need an
  // Application Fee payment — only ever populated for Application Fee
  // receipts, since that's the only fee type with multiple payable rows
  // per application (PG applicants especially).
  const [pendingCourses, setPendingCourses] = useState<{ degreeName: string; courseName: string }[]>([]);

  /* ── Load degree/course/academic-year/batch info (all fee types), plus
     fee-structure particulars (admission fee types only) for this receipt ── */
  const loadParticulars = async (feeData: FeeCollectionResponse) => {
    const feeType = feeData.feeType ?? "";
    const isInst1 = feeType.includes("Installment 1");
    const isInst2 = feeType.includes("Installment 2");
    const isFull = !isInst1 && !isInst2 && feeType.toLowerCase().includes("admission fee");

    try {
      const appNo = feeData.applicationNo ?? "";
      if (!appNo) return;

      const [fullResult, categories, batchLookups] = await Promise.all([
        getFullApplicationByAppNo(appNo),
        getLookupsByType("Category", ""),
        getLookupsByType("Batch", ""),
      ]);

      const app = fullResult?.application;
      if (!app) return;

      const gmCategory = categories.find((c) => c.name?.toUpperCase() === "GM");
      const effectiveCategoryId = app.categoryId || gmCategory?.id || undefined;

      const courseDetails = await getCourseDetailsByApplicationId(app.id);
      if (!courseDetails.length) return;

      // Application Fee only: surface any other degree/course rows on this
      // application that don't yet have a successful Application Fee record,
      // so a student who just paid for one course knows others are pending
      // instead of assuming they're fully done.
      if (feeType === "Application Fee" && courseDetails.length > 1) {
        try {
          const existingFees = await getFeesByApplicationId(app.id);
          const paidCourseIds = new Set(
            existingFees
              .filter((f) => f.feeType === "Application Fee" && f.status === "SUCCESS")
              .map((f) => (f as unknown as { courseId?: string }).courseId)
              .filter(Boolean)
          );

          const unpaid = courseDetails.filter((cd) => !paidCourseIds.has(cd.courseId));

          if (unpaid.length) {
            const resolved = await Promise.all(
              unpaid.map(async (cd) => {
                try {
                  const [d, c] = await Promise.all([
                    getDegreeById(cd.degreeId),
                    getCourseById(cd.courseId),
                  ]);
                  return { degreeName: d?.degreeName ?? "—", courseName: c?.name ?? "—" };
                } catch {
                  return null;
                }
              })
            );
            setPendingCourses(
              resolved.filter((r): r is { degreeName: string; courseName: string } => !!r)
            );
          }
        } catch {
          /* supplemental — don't block the receipt on this */
        }
      }

      const feeCourseId = (feeData as unknown as { courseId?: string }).courseId;
      const matchedCourseDetail =
        (feeCourseId && courseDetails.find((cd) => cd.courseId === feeCourseId)) ||
        courseDetails[0];

      const { degreeId, courseId, previousRegistrationNo, batchId, batchTypeId } = matchedCourseDetail as {
        degreeId: string; courseId: string; previousRegistrationNo?: string;
        batchId?: string; batchTypeId?: string;
      };

      if (previousRegistrationNo) setPrevRegNo(previousRegistrationNo);

      const [degree, course] = await Promise.all([
        getDegreeById(degreeId),
        getCourseById(courseId),
      ]);

      setDegreeName(degree?.degreeName ?? "");
      setCourseName(course?.name ?? "");
      const isCertCourse = (degree?.degreeName ?? "").toLowerCase().includes("certificate");
      setIsCertificateCourse(isCertCourse);
      if (isCertCourse && batchTypeId) {
        const batchTypeLookup = batchLookups.find((b) => b.id === batchTypeId);
        if (batchTypeLookup?.name) setBatchTypeLabel(batchTypeLookup.name);
      }

      if (isCertCourse) {
        setBatchYearLabel("2025-2026");
      }

      const allYears = await getAcademicYears().catch(() => []);

      const batchMatch = batchId ? allYears.find((y) => y.id === batchId) : undefined;
      const currentYear = app.academicYearId
        ? allYears.find((y) => y.id === app.academicYearId)
        : undefined;

      const resolvedDesc = batchMatch?.description ?? currentYear?.description ?? null;
      if (resolvedDesc) setAcademicYearDesc(resolvedDesc);

      // Non-certificate courses still resolve batch year the normal way;
      // certificate courses keep the hardcoded "2025-2026" set above.
      if (!isCertCourse) {
        const resolvedBatchYear = batchMatch?.batchYear ?? currentYear?.batchYear ?? null;
        if (resolvedBatchYear) setBatchYearLabel(`${resolvedBatchYear}`);
      }

      if (!isInst1 && !isInst2 && !isFull) return;

      const feeStructure = await getFeeByFilters(degreeId, courseId, effectiveCategoryId, batchId ?? null);
      if (!feeStructure?.details) return;

      const filtered = isInst1
        ? feeStructure.details.filter((d) => d.installment1)
        : isInst2
          ? feeStructure.details.filter((d) => d.installment2)
          : feeStructure.details;

      setParticulars(filtered);
    } catch { /* silently ignore — particulars are supplemental */ }
  };

  useEffect(() => {
    const loadReceipt = async () => {
      try {
        setLoading(true);

        // ✅ A specific receipt was requested — fetch it directly.
        // Works for any fee type (Application Fee, Admission Fee, Exam Fees, …)
        // since it's looked up by receipt number + current user, not by application id.
        let successFee: FeeCollectionResponse | null = receiptParam
          ? await getFeeByReceipt(receiptParam).catch(() => null)
          : null;

        if (!successFee) {
          const fullResult = await getMyFullApplication();
          const app = fullResult?.application;
          if (!app?.id) {
            setError("Application not found.");
            return;
          }
          const fees = await getFeesByApplicationId(app.id);
          if (!fees.length) {
            setError("No fee records found.");
            return;
          }
          const byDate = (a: typeof fees[0], b: typeof fees[0]) =>
            new Date(b.paymentDate ?? "").getTime() - new Date(a.paymentDate ?? "").getTime();

          const isAdmissionFee = (f: typeof fees[0]) =>
            (f.feeType ?? "").toLowerCase().includes("admission fee");

          const successAdmissionFees = fees.filter((f) => f.status === "SUCCESS" && isAdmissionFee(f));
          successFee =
            (successAdmissionFees.sort(byDate)[0]) ??
            (fees.filter((f) => f.status === "SUCCESS").sort(byDate)[0]) ??
            fees[0];
        }

        if (!successFee) {
          setError("Receipt not found.");
          return;
        }

        setFee(successFee);
        await loadParticulars(successFee);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Could not load receipt.");
      } finally {
        setLoading(false);
      }
    };
    loadReceipt();
  }, [receiptParam]);

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "—";
    const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(iso);
    const d = new Date(hasTimezone ? iso : `${iso}Z`);

    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  const isSuccess = (fee?.status ?? "").toLowerCase() === "success";

  if (loading) {
    return (
      <AppLayout pageTitle="Fee Receipt">
        <div className="flex items-center justify-center h-40">
          <Loader />
        </div>
      </AppLayout>
    );
  }

  if (error || !fee) {
    return (
      <AppLayout pageTitle="Fee Receipt">
        <div className="flex flex-col items-center justify-center gap-3 text-red-500 h-60">
          <XCircle size={32} />
          <p className="text-sm font-medium">{error || "Receipt not found."}</p>
        </div>
      </AppLayout>
    );
  }

  const particularsLabel =
    (fee.feeType ?? "").includes("Installment 1") ? "Installment 1 Particulars" :
      (fee.feeType ?? "").includes("Installment 2") ? "Installment 2 Particulars" :
        "Fee Particulars";

  const isInst1Receipt = (fee.feeType ?? "").includes("Installment 1");
  const isInst2Receipt = (fee.feeType ?? "").includes("Installment 2");

  // "Back to Fee Payments" should return to whichever page this receipt's
  // fee actually belongs to — Admission Fee receipts go back to the
  // admission-fee page, everything else (Application Fee, etc.) goes back
  // to the application-fee page.
  const feePaymentRoute = (fee.feeType ?? "").toLowerCase().includes("admission fee")
    ? ADMISSION_FEE_ROUTE
    : APPLICATION_FEE_ROUTE;

  const getParticularAmount = (d: AdmissionFeeStructureDetail): number => {
    if (isInst1Receipt && d.installment1Amount && d.installment1Amount > 0) return d.installment1Amount;
    if (isInst2Receipt && d.installment2Amount && d.installment2Amount > 0) return d.installment2Amount;
    return d.amount ?? 0;
  };

  return (
    <AppLayout pageTitle="Fee Receipt">
      {/* ── Print isolation ── */}
      <style>{`
  @media print {

    @page {
      size: A4 portrait;
      margin: 10mm;
    }

    html, body {
      background: white !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Hide everything, then reveal only the receipt */
    body * { visibility: hidden !important; }
    #receipt-print-area,
    #receipt-print-area * { visibility: visible !important; }

    /* Pin to top of page — NO bottom/inset so height follows content */
    #receipt-print-area {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      background: white !important;
    }

    /* ── CARD ── */
    #receipt-card {
      width: 185mm !important;
      margin: 0 auto !important;
      border-radius: 0 !important;
      overflow: visible !important;
      box-shadow: none !important;
      border: 1px solid #d1d5db !important;
      background: white !important;
    }

    /* ── HEADER ── */
    #receipt-header { padding: 10px 18px !important; }
    /* Force white text — Tailwind opacity classes may not print */
    #receipt-header * { color: white !important; font-size: 11px !important; }

    /* ── UNIVERSITY ── */
    #receipt-logo {
      padding: 8px 16px !important;
      border-bottom: 1px solid #e5e7eb !important;
    }
    #receipt-logo * { font-size: 11px !important; }
    #receipt-logo img { width: 36px !important; height: 36px !important; object-fit: contain !important; }

    /* ── RECEIPT NO ── */
    #receipt-no-row {
      padding: 5px 16px !important;
      border-bottom: 1px solid #e5e7eb !important;
    }
    #receipt-no-row * { font-size: 10px !important; }

    /* ── BARCODE ── */
    #receipt-barcode {
      padding: 6px 16px !important;
      border-bottom: 1px solid #e5e7eb !important;
    }
    #receipt-barcode svg { width: 180px !important; height: 36px !important; }

    /* ── DETAILS (student info left, payment info right) ──
       Must target * to override Tailwind's element-level text-xs / text-sm classes */
    #receipt-details { padding: 10px 16px !important; }
    #receipt-details * { font-size: 9.5px !important; line-height: 1.35 !important; }
    #receipt-details-grid { gap: 0 18px !important; }
    #receipt-details-grid > div > div { padding: 3px 0 !important; }

    /* ── PARTICULARS ── */
    #receipt-parts {
      padding: 8px 16px !important;
      border-top: 1px solid #e5e7eb !important;
    }
    #receipt-parts * { font-size: 9px !important; line-height: 1.3 !important; }

    #receipt-parts table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
    }
    #receipt-parts col:last-child { width: 55px !important; }
    #receipt-parts thead tr { background: #f3f4f6 !important; }
    #receipt-parts th {
      padding: 5px 6px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.04em !important;
      color: #6b7280 !important;
      border-bottom: 1px solid #d1d5db !important;
    }
    #receipt-parts td {
      padding: 4px 6px !important;
      border-bottom: 1px solid #f1f5f9 !important;
      color: #111827 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    #receipt-parts tfoot td {
      font-weight: 700 !important;
      border-top: 1px solid #d1d5db !important;
      padding-top: 6px !important;
    }

    /* ── FOOTER ── */
    #receipt-footer {
      padding: 6px 16px !important;
      border-top: 1px solid #e5e7eb !important;
      text-align: center !important;
      background: #f9fafb !important;
    }
    #receipt-footer * { font-size: 7px !important; line-height: 1.45 !important; color: #6b7280 !important; }

    /* ── HIDE BUTTONS ── */
    button, .print\\:hidden { display: none !important; }

    /* ── NO PAGE BREAKS INSIDE ── */
    #receipt-card, table, thead, tbody, tfoot, tr, td, th {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  }
`}</style>

      <div id="receipt-print-area" data-testid="fee-receipt-page" className="max-w-lg px-4 py-6 mx-auto space-y-3">

        {/* Back + Print buttons */}
        <div className="flex justify-between print:hidden">
          <Button onClick={() => navigate(feePaymentRoute)} variant="outline">
            <ArrowLeft size={15} />
            Back to Fee Payments
          </Button>
          <Button onClick={() => window.print()} variant="outline">
            <Printer size={15} />
            Print Receipt
          </Button>
        </div>

        {/* Other courses still pending payment */}
        {isSuccess && pendingCourses.length > 0 && (
          <div className="flex items-start gap-3 p-4 border rounded-xl border-amber-200 bg-amber-50 print:hidden">
            <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">
                {pendingCourses.length} more course{pendingCourses.length > 1 ? "s" : ""} still need{pendingCourses.length > 1 ? "" : "s"} payment
              </p>
              <ul className="mt-1.5 space-y-0.5 text-xs text-amber-800">
                {pendingCourses.map((c, i) => (
                  <li key={i}>• {c.degreeName} — {c.courseName}</li>
                ))}
              </ul>
              <Button
                onClick={() => navigate(APPLICATION_FEE_ROUTE)}
                className="mt-3 text-xs"
              >
                Pay Remaining Fees
              </Button>
            </div>
          </div>
        )}

        {/* Receipt card */}
        <div id="receipt-card" className="overflow-hidden bg-white border shadow-sm rounded-2xl">

          {/* Header */}
          <div id="receipt-header" className={`px-5 py-3 text-white text-center ${isSuccess ? "bg-emerald-600" : "bg-red-500"}`}>
            <div className="flex justify-center mb-1">
              {isSuccess
                ? <CheckCircle size={24} className="text-white" />
                : <XCircle size={24} className="text-white" />}
            </div>
            <p className="text-sm font-bold tracking-wide">
              {isSuccess ? "Payment Successful" : "Payment Failed"}
            </p>
            <p className="text-[10px] opacity-80 mt-0.5">{fmtDate(fee.paymentDate)}</p>
          </div>

          {/* Logo + university name */}
          <div id="receipt-logo" className="flex items-center justify-center gap-3 px-5 py-3 bg-white border-b">
            <img src="/logo2.png" alt="MGRDPR University" className="object-contain w-8 h-8" />
            <div className="text-center">
              <p className="text-sm font-bold leading-tight text-gray-800">MGRDPR University</p>
              <p className="text-[10px] text-gray-400 tracking-wide">Fee Payment Receipt</p>
            </div>
          </div>

          {/* Receipt No. */}
          <div id="receipt-no-row" className="flex items-center justify-between px-5 py-2 border-b bg-gray-50">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Receipt size={12} />
              <span>Receipt No.</span>
            </div>
            <span className="font-mono text-xs font-bold tracking-widest text-primary">
              {fee.receiptNumber}
            </span>
          </div>

          {/* Barcode — success only */}
          {isSuccess && (
            <div id="receipt-barcode" className="flex justify-center px-5 py-2 bg-white border-b">
              <Barcode
                value={fee.receiptNumber || "NA"}
                format="CODE128"
                width={1.4}
                height={38}
                displayValue={false}
              />
            </div>
          )}

          {/* Details — student info on the left, payment info on the right (print: 2 columns) */}
          <div id="receipt-details" className="px-5 py-4">
            <div id="receipt-details-grid" className="grid grid-cols-1 print:grid-cols-2 gap-x-8 gap-y-4">

              {/* Student / application info */}
              <div>
                <Row label="Application No." value={fee.applicationNo ?? "—"} />
                <Row label="Name" value={fee.name ?? "—"} />
                {degreeName && <Row label={isCertificateCourse ? "Program" : "Degree"} value={degreeName} />}
                {courseName && <Row label="Course" value={courseName} />}
                {prevRegNo && <Row label="Prev. Reg. No." value={prevRegNo} mono />}
                {isCertificateCourse ? (
                  <>
                    {academicYearDesc && <Row label="Academic Year" value={academicYearDesc} />}
                    {batchYearLabel && <Row label="Batch Year" value={batchYearLabel} />}
                    {batchTypeLabel && <Row label="Batch Type" value={batchTypeLabel} />}
                  </>
                ) : (
                  (academicYearDesc || batchYearLabel) && (
                    <Row label="Academic Year">
                      <span className="text-sm font-semibold text-left text-gray-700">
                        {academicYearDesc}
                        {batchYearLabel && (
                          <span className="font-bold"> ({batchYearLabel})</span>
                        )}
                      </span>
                    </Row>
                  )
                )}
              </div>

              {/* Payment info */}
              <div>
                <Row label="Fee Type" value={fee.feeType ?? "—"} />
                <Row label="Amount" value={`₹${fee.amount.toLocaleString("en-IN")}`} numeric />
                <Row
                  label="Total Paid"
                  value={`₹${(fee.paidAmount || fee.amount).toLocaleString("en-IN")}`}
                  bold
                  numeric
                />
                <Row label="Status">
                  <span className={`inline-block justify-self-start w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${isSuccess ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>
                    {fee.status ?? "—"}
                  </span>
                </Row>
                {isSuccess && fee.transactionId && <Row label="Transaction ID" value={fee.transactionId} mono />}
                {isSuccess && fee.orderId && <Row label="Order ID" value={fee.orderId} mono />}
                <Row label="Payment Date" value={fmtDate(fee.paymentDate)} />
              </div>

            </div>
          </div>

          {/* Particulars */}
          {particulars.length > 0 && (
            <div id="receipt-parts" className="px-5 pt-2 pb-3 border-t">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {particularsLabel}
              </p>
              <table className="w-full border-collapse table-fixed">
                <colgroup>
                  <col />
                  <col className="w-20" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-1.5 text-[9px] text-gray-400 font-medium uppercase tracking-wide">Particular</th>
                    <th className="text-right py-1.5 text-[9px] text-gray-400 font-medium uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {particulars.map((d, i) => (
                    <tr key={d.id ?? i} className={`border-b border-dashed border-gray-100 last:border-0 ${i % 2 === 1 ? "bg-gray-50/60" : ""}`}>
                      <td className="py-1 text-[10px] text-gray-700 truncate">{d.particularName ?? "—"}</td>
                      <td className="py-1 text-right text-[10px] text-gray-700 tabular-nums">
                        ₹{getParticularAmount(d).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {(() => {
                    const particularsSubtotal = particulars.reduce((s, d) => s + getParticularAmount(d), 0);
                    const derivedLateFine = Math.round(fee.amount - particularsSubtotal);
                    return derivedLateFine > 0 ? (
                      <tr className="border-b border-gray-100 border-dashed">
                        <td className="py-1 text-[10px] text-amber-700 font-medium">Late Fine</td>
                        <td className="py-1 text-right text-[10px] text-amber-700 font-medium tabular-nums">
                          ₹{derivedLateFine.toLocaleString()}
                        </td>
                      </tr>
                    ) : null;
                  })()}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="pt-1.5 text-[10px] font-semibold text-gray-800">Total Paid</td>
                    <td className="pt-1.5 text-right text-[10px] font-bold text-primary tabular-nums">
                      ₹{(fee.paidAmount || fee.amount).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Footer */}
          <div id="receipt-footer" className="bg-gray-50 border-t px-5 py-2 text-center text-[9px] text-gray-400 leading-snug">
            This is a computer-generated receipt and does not require a signature.
            Admission shall be confirmed only upon physical verification of the duly submitted online
            admission application along with all uploaded original documents, by the University’s Admission Section.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Row({
  label, value, bold, mono, numeric, children,
}: {
  label: string; value?: string; bold?: boolean; mono?: boolean; numeric?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] print:grid-cols-[65px_1fr] items-baseline gap-x-3 py-1 border-b border-dashed border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      {children ?? (
        <span className={`text-sm text-left break-words ${numeric ? "tabular-nums" : ""} ${bold ? "font-bold text-gray-900" : "font-medium text-gray-700"} ${mono ? "font-mono" : ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}