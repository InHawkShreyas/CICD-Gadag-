import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Receipt, Eye, X, Printer, Search, IndianRupee, CheckCircle, AlertCircle,
} from "lucide-react";
import Barcode from "react-barcode";
import AppLayout from "../../components/layouts/AppLayout";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Loader from "../../components/ui/Loader";
import { getMyFullApplication } from "../../services/applicationQueryService";
import { getCourseDetailsByApplicationId } from "../../services/applicationCourseDetailService";
import { getCourseById } from "../../services/courseService";
import { getDegreeById } from "../../services/degreeService";
import { getLookupsByType } from "../../services/lookupService";
import { getAcademicYears } from "../../services/academicYearService";
import {
  getFeeCollectionManualByAppNo,
  type FeeCollectionManualResponseDto,
} from "../../services/feecollectionmanualService";

/* ─── Types ────────────────────────────────────────────────── */

type StudentInfo = {
  appNo: string;
  name: string;
  category: string;
  degreeName: string;
  courseName: string;
  batchDesc?: string;
  batchYear?: string;
};

/* ─── Component ────────────────────────────────────────────── */

export default function ManualFeeReceiptPage() {
  const username = sessionStorage.getItem("username") ?? "Student";

  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [student, setStudent]           = useState<StudentInfo | null>(null);
  const [receipts, setReceipts]         = useState<FeeCollectionManualResponseDto[]>([]);
  const [search, setSearch]             = useState("");
  const [viewing, setViewing]           = useState<FeeCollectionManualResponseDto | null>(null);

  /* ── Load student's own application + manual receipts ───────────────── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [fullResult, categories, academicYears] = await Promise.all([
          getMyFullApplication(),
          getLookupsByType("Category", ""),
          getAcademicYears().catch(() => []),
        ]);

        const app = fullResult?.application;
        if (!app?.id) {
          setLoadError("No application found for your account yet.");
          setStudent(null);
          setReceipts([]);
          return;
        }

        const categoryName = categories.find((c) => c.id === app.categoryId)?.name ?? "—";

        type CourseDetail = { degreeId: string; courseId: string; batchId?: string };
        let degreeName = "—", courseName = "—";
        let batchDesc = "", batchYear = "";
        const currentYearMatch = app.academicYearId
          ? academicYears.find((y) => y.id === app.academicYearId)
          : undefined;
        batchDesc = currentYearMatch?.description ?? "";

        try {
          const courseDetails = (await getCourseDetailsByApplicationId(app.id)) as CourseDetail[];
          if (courseDetails.length) {
            const cd = courseDetails[0];
            const batchMatch = cd.batchId ? academicYears.find((y) => y.id === cd.batchId) : undefined;
            batchYear = batchMatch?.batchYear ?? currentYearMatch?.batchYear ?? "";
            const [deg, crs] = await Promise.all([
              getDegreeById(cd.degreeId),
              getCourseById(cd.courseId),
            ]);
            degreeName = deg?.degreeName ?? "—";
            courseName = crs?.name ?? "—";
          } else {
            batchYear = currentYearMatch?.batchYear ?? "";
          }
        } catch { /* course details not filled yet */ }

        setStudent({
          appNo: app.appNo,
          name: app.name || username,
          category: categoryName,
          degreeName, courseName, batchDesc, batchYear,
        });

        try {
          const list = await getFeeCollectionManualByAppNo(app.appNo);
          setReceipts(list ?? []);
        } catch {
          setReceipts([]);
        }
      } catch {
        setLoadError("Failed to load your receipts. Please try again.");
        setStudent(null);
        setReceipts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  const filteredReceipts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return receipts.filter((r) =>
      !q ||
      (r.receiptNo ?? "").toLowerCase().includes(q) ||
      (r.feeName ?? "").toLowerCase().includes(q) ||
      (r.transactionId ?? "").toLowerCase().includes(q)
    );
  }, [receipts, search]);

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  const closeViewer = () => setViewing(null);

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <AppLayout pageTitle="My Receipts">
      <div data-testid="student-receipts" className="pb-8 space-y-4">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-text">My Receipts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Receipts for fees paid in person at the university office.
          </p>
        </div>

        {/* ── Receipt list ─────────────────────────────────────────── */}
        <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b bg-gray-50/80">
            <p className="text-sm font-semibold text-gray-700">Manual Payment Receipts</p>
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute text-gray-400 -translate-y-1/2 pointer-events-none left-3 top-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search receipt no., fee type…"
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-primary"
              />
            </div>
            <span className="text-xs font-medium text-gray-400 shrink-0 bg-gray-100 px-2.5 py-1 rounded-full">
              {filteredReceipts.length} records
            </span>
          </div>

          {loading ? (
            <div className="py-16"><Loader /></div>
          ) : loadError ? (
            <div className="p-16 text-center">
              <div className="flex items-center justify-center mx-auto mb-4 rounded-full bg-amber-50 w-14 h-14">
                <AlertCircle size={24} className="text-amber-400" />
              </div>
              <p className="text-base font-semibold text-gray-600">{loadError}</p>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="p-16 text-center">
              <div className="flex items-center justify-center mx-auto mb-4 bg-gray-100 rounded-full w-14 h-14">
                <Receipt size={24} className="text-gray-300" />
              </div>
              <p className="text-base font-semibold text-gray-600">No receipts found</p>
              <p className="mt-1 text-sm text-gray-400">
                {search
                  ? "Try a different search term."
                  : "If you've paid fees in person at the university office, your receipt will appear here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-xs font-semibold text-white bg-primary">
                    <th className="px-3 py-2 text-center">Receipt No.</th>
                    <th className="px-3 py-2 text-left">Fee Type</th>
                    <th className="px-3 py-2 text-center">Mode</th>
                    <th className="px-3 py-2 text-center">Date</th>
                    <th className="px-3 py-2 text-center">Amount</th>
                    <th className="px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.map((r, idx) => (
                    <tr
                      key={r.id}
                      className={`transition-colors hover:bg-primary/5 ${idx !== 0 ? "border-t border-slate-100" : ""}`}
                    >
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-mono text-sm font-bold text-primary">{r.receiptNo}</span>
                      </td>
                      <td className="px-3 py-2.5 text-left">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {r.feeName}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-[13px] font-semibold text-slate-600">
                        {r.paymentMode ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center text-[13px] font-semibold text-slate-500">
                        {fmtDate(r.paymentDate)}
                      </td>
                      <td className="px-3 py-2.5 text-center text-[13px] font-bold text-slate-800">
                        ₹{r.feeAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => setViewing(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-white bg-primary border border-primary/30 hover:bg-primary/10 hover:text-primary transition"
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          ── Receipt Viewer Modal ──
      ══════════════════════════════════════════════════════ */}
      <Modal open={!!viewing} onClose={closeViewer} title="Receipt" size="xl" testId="view-receipt-modal">
        {viewing && (
          <div className="space-y-4">
            <style>{`
              #receipt-printroot { display: none !important; visibility: hidden !important; }
              @media print {
                @page { size: A4 portrait; margin: 10mm; }
                html, body {
                  background: white !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  margin: 0 !important; padding: 0 !important;
                  width: 100% !important; height: 100% !important;
                }
                body > * { display: none !important; }
                #receipt-printroot {
                  display: block !important; visibility: visible !important;
                  position: static !important; width: 100% !important;
                  margin: 0 !important; padding: 0 !important; z-index: 99999 !important;
                }
                #receipt-printroot * { visibility: visible !important; }
                #rp-card {
                  width: 100% !important; max-width: 600px !important;
                  border: 1px solid #e5e7eb !important; border-radius: 8px !important;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
                  overflow: visible !important; page-break-inside: avoid !important;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
                  margin: auto !important; padding: 0 !important; background: white !important;
                }
                #rp-card * { box-sizing: border-box !important; }
                #rp-header {
                  background-color: #820000 !important; color: white !important;
                  padding: 16px 20px !important; display: flex !important;
                  align-items: center !important; gap: 12px !important;
                  border-radius: 8px 8px 0 0 !important;
                }
                #rp-header img { width: 36px !important; height: 36px !important; object-fit: contain !important; }
                #rp-header div:nth-of-type(2) { flex: 1 !important; }
                #rp-header h2 { font-size: 14px !important; font-weight: 700 !important; margin: 0 !important; line-height: 1.3 !important; }
                #rp-header p { font-size: 10px !important; opacity: 0.85 !important; margin: 2px 0 0 0 !important; }
                #rp-header .rp-badge {
                  margin-left: auto !important; background: rgba(255,255,255,0.15) !important;
                  border-radius: 4px !important; padding: 4px 8px !important; font-size: 8px !important;
                  letter-spacing: 0.08em !important; font-weight: 600 !important; color: white !important;
                  white-space: nowrap !important;
                }
                #rp-strip {
                  display: flex !important; align-items: flex-start !important;
                  justify-content: space-between !important; padding: 8px 20px !important;
                  border-bottom: 1px solid #e5e7eb !important; background: #f9fafb !important;
                }
                #rp-strip > div:first-child { flex: 1 !important; }
                #rp-strip .rp-label { font-size: 9px !important; color: #9ca3af !important; text-transform: uppercase !important; letter-spacing: 0.06em !important; font-weight: 600 !important; }
                #rp-strip .rp-value { font-size: 13px !important; font-weight: 700 !important; font-family: monospace !important; color: #1e3a5f !important; margin-top: 4px !important; }
                #rp-barcode { display: flex !important; justify-content: center !important; padding: 8px 20px !important; border-bottom: 1px solid #e5e7eb !important; }
                #rp-barcode svg { height: 36px !important; width: auto !important; }
                #rp-body { padding: 16px 20px !important; }
                .rp-section-label { font-size: 9px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.08em !important; color: #9ca3af !important; margin-bottom: 8px !important; }
                .rp-info-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px 24px !important; margin-bottom: 12px !important; }
                .rp-info-grid > div { display: block !important; }
                .rp-info-grid .rp-cell-label { font-size: 8px !important; color: #9ca3af !important; text-transform: uppercase !important; letter-spacing: 0.06em !important; margin-bottom: 2px !important; }
                .rp-info-grid .rp-cell-value { font-size: 11px !important; font-weight: 600 !important; color: #111827 !important; }
                .rp-divider { border: none !important; border-top: 1px solid #e5e7eb !important; margin: 12px 0 !important; }
                #rp-particulars { width: 100% !important; border-collapse: collapse !important; margin-bottom: 12px !important; }
                #rp-particulars thead { display: table-header-group !important; }
                #rp-particulars thead tr { background: #f9fafb !important; }
                #rp-particulars th { padding: 8px 0 !important; font-size: 9px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.06em !important; color: #6b7280 !important; border-bottom: 1px solid #e5e7eb !important; text-align: left !important; }
                #rp-particulars th:last-child { text-align: right !important; }
                #rp-particulars td { padding: 6px 0 !important; border-bottom: 1px solid #f3f4f6 !important; font-size: 11px !important; }
                #rp-particulars td:last-child { text-align: right !important; font-weight: 600 !important; }
                #rp-particulars tfoot { display: table-footer-group !important; }
                #rp-particulars tfoot td { padding: 8px 0 !important; font-weight: 700 !important; border-top: 2px solid #1e3a5f !important; color: #1e3a5f !important; font-size: 12px !important; }
                #rp-particulars tfoot td:last-child { text-align: right !important; }
                #rp-total { display: flex !important; justify-content: space-between !important; align-items: center !important; padding: 12px 0 !important; border-top: 2px solid #1e3a5f !important; }
                #rp-total .rp-total-label { font-size: 12px !important; font-weight: 600 !important; color: #374151 !important; }
                #rp-total .rp-total-value { font-size: 16px !important; font-weight: 800 !important; color: #1e3a5f !important; }
                #rp-footer { padding: 12px 20px !important; text-align: center !important; font-size: 9px !important; color: #9ca3af !important; border-top: 1px solid #e5e7eb !important; background: #f9fafb !important; line-height: 1.5 !important; border-radius: 0 0 8px 8px !important; }
              }
            `}</style>

            {/* On-screen actions */}
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100">
                  <CheckCircle size={16} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{viewing.feeName}</p>
                  <p className="text-xs text-gray-400">{viewing.receiptNo}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer size={14} /> Print
                </Button>
                <Button variant="primary" onClick={closeViewer}>
                  <X size={14} /> Close
                </Button>
              </div>
            </div>

            {/* On-screen receipt preview */}
            <div className="max-w-lg mx-auto overflow-hidden bg-white border shadow-sm rounded-xl">
              <div className="flex items-center gap-3 px-5 py-4 text-white bg-primary">
                <img src="/logo2.png" alt="logo" className="object-contain w-9 h-9 shrink-0" />
                <div className="flex-1">
                  <h2 className="text-sm font-bold leading-tight">MGRDPR University</h2>
                  <p className="text-[10px] opacity-80">Kaushalya Vikas Bhavan, Nagavi, Gadag</p>
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-widest opacity-90 bg-white/15 rounded px-2 py-1">
                  Fee Receipt
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-2 border-b bg-gray-50">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">Receipt No.</span>
                <span className="font-mono text-sm font-bold tracking-widest text-primary">{viewing.receiptNo}</span>
              </div>
              <div className="flex justify-center px-5 py-2.5 border-b">
                <Barcode value={viewing.receiptNo || "NA"} format="CODE128" width={1.4} height={36} displayValue={false} />
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 text-sm gap-x-5 gap-y-3">
                  <PRow label="Application No." value={viewing.appNo ?? student?.appNo ?? "—"} />
                  <PRow label="Student Name" value={student?.name ?? "—"} />
                  <PRow label="Category" value={student?.category ?? "—"} />
                  <PRow label="Degree" value={student?.degreeName ?? "—"} />
                  <PRow label="Course" value={student?.courseName ?? "—"} />
                  {student?.batchDesc && <PRow label="Academic Year" value={student.batchDesc} />}
                  {student?.batchYear && <PRow label="Batch Year" value={student.batchYear} />}
                  <PRow label="Fee Type" value={viewing.feeName} />
                  <PRow label="Mode" value={viewing.paymentMode ?? "—"} />
                  <PRow label="Transaction ID" value={viewing.transactionId ?? "—"} />
                  <PRow label="Date" value={fmtDate(viewing.paymentDate)} />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                      <CheckCircle size={10} /> SUCCESS
                    </span>
                  </div>
                </div>

                {viewing.details?.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Fee Particulars</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Particular</th>
                          <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {viewing.details.map((d, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1.5 text-gray-700">{d.particularName}</td>
                            <td className="px-2 py-1.5 text-right font-medium text-gray-800">₹{(d.particularAmt ?? 0).toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-primary">
                          <td className="px-2 py-2 font-bold text-gray-700">Total</td>
                          <td className="px-2 py-2 text-base font-bold text-right text-primary">₹{viewing.feeAmount.toLocaleString("en-IN")}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {(!viewing.details || viewing.details.length === 0) && (
                  <div className="flex items-center justify-between pt-3 border-t-2 border-primary">
                    <span className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                      <IndianRupee size={14} className="opacity-70" /> Total Amount Collected
                    </span>
                    <span className="text-xl font-bold text-primary">₹{viewing.feeAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 border-t px-5 py-2 text-center text-[9px] text-gray-400 leading-relaxed">
                This is a computer-generated receipt and does not require a signature.
                Admission shall be confirmed only upon physical verification of the duly submitted online admission application.
              </div>
            </div>

            {/* Print portal */}
            {typeof window !== "undefined" && createPortal(
              <div id="receipt-printroot" aria-hidden="true">
                <div id="rp-card">
                  <div id="rp-header">
                    <img src="/logo2.png" alt="" />
                    <div>
                      <h2>MGRDPR University</h2>
                      <p>Kaushalya Vikas Bhavan, Nagavi, Gadag</p>
                    </div>
                    <span className="rp-badge">Fee Receipt</span>
                  </div>
                  <div id="rp-strip">
                    <div>
                      <div className="rp-label">Receipt No.</div>
                      <div className="rp-value">{viewing.receiptNo}</div>
                    </div>
                    <div id="rp-barcode">
                      <Barcode value={viewing.receiptNo || "NA"} format="CODE128" width={1.4} height={36} displayValue={false} />
                    </div>
                  </div>
                  <div id="rp-body">
                    <div className="rp-info-grid">
                      <div><div className="rp-cell-label">Application No.</div><div className="rp-cell-value">{viewing.appNo ?? student?.appNo ?? "—"}</div></div>
                      <div><div className="rp-cell-label">Student Name</div><div className="rp-cell-value">{student?.name ?? "—"}</div></div>
                      <div><div className="rp-cell-label">Category</div><div className="rp-cell-value">{student?.category ?? "—"}</div></div>
                      <div><div className="rp-cell-label">Degree</div><div className="rp-cell-value">{student?.degreeName ?? "—"}</div></div>
                      <div><div className="rp-cell-label">Course</div><div className="rp-cell-value">{student?.courseName ?? "—"}</div></div>
                      {student?.batchDesc && (
                        <div><div className="rp-cell-label">Academic Year</div><div className="rp-cell-value">{student.batchDesc}</div></div>
                      )}
                      {student?.batchYear && (
                        <div><div className="rp-cell-label">Batch Year</div><div className="rp-cell-value">{student.batchYear}</div></div>
                      )}
                      <div><div className="rp-cell-label">Fee Type</div><div className="rp-cell-value">{viewing.feeName}</div></div>
                      <div><div className="rp-cell-label">Mode</div><div className="rp-cell-value">{viewing.paymentMode ?? "—"}</div></div>
                      <div><div className="rp-cell-label">Transaction ID</div><div className="rp-cell-value">{viewing.transactionId ?? "—"}</div></div>
                      <div><div className="rp-cell-label">Date</div><div className="rp-cell-value">{fmtDate(viewing.paymentDate)}</div></div>
                      <div><div className="rp-cell-label">Status</div><div className="rp-cell-value">SUCCESS ✓</div></div>
                    </div>

                    <hr className="rp-divider" />

                    {viewing.details?.length > 0 && (
                      <>
                        <div className="rp-section-label">Fee Particulars</div>
                        <table id="rp-particulars">
                          <thead>
                            <tr><th>Particular</th><th>Amount (₹)</th></tr>
                          </thead>
                          <tbody>
                            {viewing.details.map((d, i) => (
                              <tr key={i}>
                                <td>{d.particularName}</td>
                                <td>₹{(d.particularAmt ?? 0).toLocaleString("en-IN")}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr><td>Total</td><td>₹{viewing.feeAmount.toLocaleString("en-IN")}</td></tr>
                          </tfoot>
                        </table>
                      </>
                    )}

                    {(!viewing.details || viewing.details.length === 0) && (
                      <div id="rp-total">
                        <span className="rp-total-label">Total Amount Collected</span>
                        <span className="rp-total-value">₹{viewing.feeAmount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                  <div id="rp-footer">
                    This is a computer-generated receipt and does not require a signature.<br />
                    Admission shall be confirmed only upon physical verification of the duly submitted online admission application.
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}

/* ─── Helper components ──────────────────────────────────── */

function PRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-semibold leading-snug text-gray-800">{value}</p>
    </div>
  );
}