import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Printer, CheckCircle, XCircle, Receipt } from "lucide-react";
import { getFeeByReceiptAdmin, type FeeCollectionResponse } from "../../services/feeCollectionService";
import Barcode from "react-barcode";
import {
  getFullApplicationByAppNo,
} from "../../services/applicationQueryService";
import { getFeeByFilters, type AdmissionFeeStructureDetail } from "../../services/admissionFeeStructureService";
import { getLookupsByType } from "../../services/lookupService";
import { getDegreeById } from "../../services/degreeService";
import { getCourseById } from "../../services/courseService";
import { getAcademicYears } from "../../services/academicYearService";
import { getCourseDetailsByApplicationId } from "../../services/applicationCourseDetailService";

type CourseDetailItem = {
  degreeId: string;
  courseId: string;
  batchId?: string | null;
  batchTypeId?: string | null;
  previousRegistrationNo?: string | null;
};

export default function AdminFeeReceiptPage() {
  const [searchParams] = useSearchParams();
  const receiptParam = searchParams.get("receipt");

  const [fee, setFee] = useState<FeeCollectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [particulars, setParticulars] = useState<AdmissionFeeStructureDetail[]>([]);
  const [degreeName, setDegreeName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [prevRegNo, setPrevRegNo] = useState<string | null>(null);
  const [academicYearDesc, setAcademicYearDesc] = useState<string | null>(null);
  const [batchYearLabel, setBatchYearLabel] = useState<string | null>(null);
  const [isCertificateCourse, setIsCertificateCourse] = useState<boolean>(false);
  const [batchTypeLabel, setBatchTypeLabel] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!receiptParam) {
        setError("No receipt number provided.");
        setLoading(false);
        return;
      }
      try {
        /* ── Step 1: get fee record by receipt number ── */
        const feeData = await getFeeByReceiptAdmin(receiptParam);
        setFee(feeData);

        /* ── Step 2: load application + fee structure ── */
        await loadDetails(feeData);
        setError(null);
      } catch {
        setError("Could not load receipt.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [receiptParam]);

  const loadDetails = async (feeData: FeeCollectionResponse) => {
    const feeType = feeData.feeType ?? "";
    const isInst1 = feeType.includes("Installment 1");
    const isInst2 = feeType.includes("Installment 2");
    const isFull = !isInst1 && !isInst2 && feeType.toLowerCase().includes("admission fee");

    const appNo = feeData.applicationNo;
    if (!appNo) return;

    try {
      /* ── Step 3: get full application, categories & batch lookups in parallel ── */
      const [fullApp, categories, batchLookups] = await Promise.all([
        getFullApplicationByAppNo(appNo),
        getLookupsByType("Category", ""),
        getLookupsByType("Batch", ""),
      ]);

      const app = fullApp.application;
      if (!app) return;

      const gmCategory = categories.find((c) => c.name?.toUpperCase() === "GM");
      const effectiveCategoryId = app.categoryId || gmCategory?.id || undefined;

      const courseDetails = (await getCourseDetailsByApplicationId(app.id)) as CourseDetailItem[];
      if (!courseDetails.length) return;

      const feeCourseId = (feeData as unknown as { courseId?: string }).courseId;
      const matchedCourseDetail =
        (feeCourseId && courseDetails.find((cd) => cd.courseId === feeCourseId)) ||
        courseDetails[0];

      const { degreeId, courseId, previousRegistrationNo, batchId, batchTypeId } = matchedCourseDetail;

      if (previousRegistrationNo) setPrevRegNo(previousRegistrationNo);

      const [degree, course, academicYears] = await Promise.all([
        getDegreeById(degreeId),
        getCourseById(courseId),
        getAcademicYears().catch(() => [] as Awaited<ReturnType<typeof getAcademicYears>>),
      ]);

      setDegreeName(degree?.degreeName ?? "");
      setCourseName(course?.name ?? "");

      // Certificate-course detection is derived from the resolved degree
      // name for THIS application, same as the student-facing receipt.
      const isCertCourse = (degree?.degreeName ?? "").toLowerCase().includes("certificate");
      setIsCertificateCourse(isCertCourse);

      // Batch Type — only meaningful for Certificate courses (Morning /
      // Evening / Weekend), resolved from the "Batch" lookup via batchTypeId.
      if (isCertCourse && batchTypeId) {
        const batchTypeLookup = batchLookups.find((b) => b.id === batchTypeId);
        if (batchTypeLookup?.name) setBatchTypeLabel(batchTypeLookup.name);
      }

      // Batch Year — hardcoded for Certificate courses per current
      // admission cycle (certificate course details carry no batchId).
      if (isCertCourse) {
        setBatchYearLabel("2025-2026");
      }

      // "Academic Year" = the current academic year being applied/paid for.
      // Falls back to the batch matched via batchId if academicYearId isn't set.
      const batchMatch = batchId ? academicYears.find((y) => y.id === batchId) : undefined;
      const currentYear = app.academicYearId
        ? academicYears.find((y) => y.id === app.academicYearId)
        : undefined;

      const resolvedDesc = batchMatch?.description ?? currentYear?.description ?? null;
      if (resolvedDesc) setAcademicYearDesc(resolvedDesc);

      // Non-certificate courses resolve batch year the normal way;
      // certificate courses keep the hardcoded "2025-2026" set above.
      if (!isCertCourse) {
        const resolvedBatchYear = batchMatch?.batchYear ?? currentYear?.batchYear ?? null;
        if (resolvedBatchYear) setBatchYearLabel(`${resolvedBatchYear}`);
      }

      // Fee-structure particulars breakdown only applies to admission fee
      // receipts (Installment 1 / 2 / full).
      if (!isInst1 && !isInst2 && !isFull) return;

      const feeStructure = await getFeeByFilters(degreeId, courseId, effectiveCategoryId, batchId ?? null);
      if (!feeStructure?.details?.length) return;

      /* ── Filter particulars by installment condition ── */
      const filtered = isInst1
        ? feeStructure.details.filter((d) => d.installment1)
        : isInst2
          ? feeStructure.details.filter((d) => d.installment2)
          : feeStructure.details;

      setParticulars(filtered);
    } catch { /* supplemental — non-critical */ }
  };

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

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <p className="text-sm text-gray-400 animate-pulse">Loading receipt…</p>
    </div>
  );

  if (error || !fee) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-red-500 bg-gray-50">
      <XCircle size={32} />
      <p className="text-sm font-medium">{error ?? "Receipt not found."}</p>
    </div>
  );

  const isInst1Receipt = (fee.feeType ?? "").includes("Installment 1");
  const isInst2Receipt = (fee.feeType ?? "").includes("Installment 2");

  const particularsLabel =
    isInst1Receipt ? "Installment 1 Particulars" :
      isInst2Receipt ? "Installment 2 Particulars" :
        "Fee Particulars";

  const getParticularAmount = (d: AdmissionFeeStructureDetail): number => {
    if (isInst1Receipt && d.installment1Amount && d.installment1Amount > 0) return d.installment1Amount;
    if (isInst2Receipt && d.installment2Amount && d.installment2Amount > 0) return d.installment2Amount;
    return d.amount ?? 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
  @media print {
    @page { size: A4 portrait; margin: 10mm; }
    html, body { background: white !important; margin: 0 !important; padding: 0 !important;
      -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body * { visibility: hidden !important; }
    #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
    #receipt-print-area { position: absolute !important; top: 0 !important; left: 0 !important;
      right: 0 !important; padding: 0 !important; margin: 0 !important; background: white !important; }
    #receipt-card { width: 185mm !important; margin: 0 auto !important; border-radius: 0 !important;
      overflow: visible !important; box-shadow: none !important; border: 1px solid #d1d5db !important; background: white !important; }
    #receipt-header { padding: 10px 18px !important; }
    #receipt-header * { color: white !important; font-size: 11px !important; }
    #receipt-logo { padding: 8px 16px !important; border-bottom: 1px solid #e5e7eb !important; }
    #receipt-logo * { font-size: 11px !important; }
    #receipt-logo img { width: 36px !important; height: 36px !important; object-fit: contain !important; }
    #receipt-no-row { padding: 5px 16px !important; border-bottom: 1px solid #e5e7eb !important; }
    #receipt-no-row * { font-size: 10px !important; }
    #receipt-barcode { padding: 6px 16px !important; border-bottom: 1px solid #e5e7eb !important; }
    #receipt-barcode svg { width: 180px !important; height: 36px !important; }
    #receipt-details { padding: 10px 16px !important; }
    #receipt-details * { font-size: 9.5px !important; line-height: 1.35 !important; }
    #receipt-details-grid { gap: 0 18px !important; }
    #receipt-details-grid > div > div { padding: 3px 0 !important; }
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
    #receipt-footer { padding: 6px 16px !important; border-top: 1px solid #e5e7eb !important;
      text-align: center !important; background: #f9fafb !important; }
    #receipt-footer * { font-size: 7px !important; line-height: 1.45 !important; color: #6b7280 !important; }
    button, .print\\:hidden { display: none !important; }
    #receipt-card, table, thead, tbody, tfoot, tr, td, th { page-break-inside: avoid !important; break-inside: avoid !important; }
  }
`}</style>

      <div id="receipt-print-area" className="max-w-lg px-4 py-6 mx-auto space-y-3">

        <div className="flex justify-end print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Printer size={15} />
            Print Receipt
          </button>
        </div>

        <div id="receipt-card" className="overflow-hidden bg-white border shadow-sm rounded-2xl">

          {/* Header */}
          <div id="receipt-header" className={`px-5 py-3 text-white text-center ${isSuccess ? "bg-emerald-600" : "bg-red-500"}`}>
            <div className="flex justify-center mb-1">
              {isSuccess ? <CheckCircle size={24} className="text-white" /> : <XCircle size={24} className="text-white" />}
            </div>
            <p className="text-sm font-bold tracking-wide">
              {isSuccess ? "Payment Successful" : "Payment Failed"}
            </p>
            <p className="text-[10px] opacity-80 mt-0.5">{fmtDate(fee.paymentDate)}</p>
          </div>

          {/* University */}
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
            <span className="font-mono text-xs font-bold tracking-widest text-primary">{fee.receiptNumber}</span>
          </div>

          {/* Barcode */}
          {isSuccess && (
            <div id="receipt-barcode" className="flex justify-center px-5 py-2 bg-white border-b">
              <Barcode value={fee.receiptNumber || "NA"} format="CODE128" width={1.4} height={38} displayValue={false} />
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

          {/* Particulars from fee structure */}
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
                    const subtotal = particulars.reduce((s, d) => s + getParticularAmount(d), 0);
                    const lateFine = Math.round(fee.amount - subtotal);
                    return lateFine > 0 ? (
                      <tr className="border-b border-gray-100 border-dashed">
                        <td className="py-1 text-[10px] text-amber-700 font-medium">Late Fine</td>
                        <td className="py-1 text-right text-[10px] text-amber-700 font-medium tabular-nums">
                          ₹{lateFine.toLocaleString()}
                        </td>
                      </tr>
                    ) : null;
                  })()}
                  {fee.platformCharges > 0 && (
                    <tr className="border-b border-gray-100 border-dashed">
                      <td className="py-1 text-[10px] text-gray-500">Platform Charges</td>
                      <td className="py-1 text-right text-[10px] text-gray-500 tabular-nums">
                        ₹{fee.platformCharges.toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="pt-1.5 text-[10px] font-semibold text-gray-800">Total Paid</td>
                    <td className="pt-1.5 text-right text-[10px] font-bold text-primary tabular-nums">
                      ₹{(fee.paidAmount || (fee.amount + fee.platformCharges)).toLocaleString()}
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
            admission application along with all uploaded original documents, by the University's Admission Section.
          </div>
        </div>
      </div>
    </div>
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