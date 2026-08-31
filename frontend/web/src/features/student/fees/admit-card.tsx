import { useState, useEffect } from "react";
import { Download, CheckCircle, Lock, Building2, BookOpen, Award } from "lucide-react";
import Button from "../../../components/ui/Button";
import AppLayout from "../../../components/layouts/AppLayout";
import { getMyFullApplication } from "../../../services/applicationQueryService";
import { getCourseDetailsByApplicationId } from "../../../services/applicationCourseDetailService";
import { getCourseById } from "../../../services/courseService";
import { getDegreeById } from "../../../services/degreeService";
import { getLookupsByType } from "../../../services/lookupService";
import { getAllFeeCollections } from "../../../services/feeCollectionService";
import { getApplicationPhoto } from "../../../services/applicationPhotoService";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type AdmitCardData = {
  appNo: string;
  name: string;
  fatherName: string;
  category: string;
  degreeName: string;
  courseName: string;
  academicYear: string;
  receiptNumber: string;
  photoUrl?: string;
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function AdmitCardPage() {
  const [card, setCard]       = useState<AdmitCardData | null>(null);
  const [locked, setLocked]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState("");

useEffect(() => {
  const load = async () => {
    try {

      // ✅ Backend resolves correct application using session username
      const [fullResult, categories, feeCollections] = await Promise.all([
        getMyFullApplication(),
        getLookupsByType("Category", ""),
        getAllFeeCollections(),
      ]);

      const app = fullResult.application;

      if (!app) {
        setMessage("No application found.");
        return;
      }

      // ✅ ALWAYS use backend-resolved values
      const appNo = app.appNo;
      const applicationId = app.id;

      // ✅ Filter fee collection for THIS application only
      const admissionFeeRecord = feeCollections.find(
        (f) =>
          f.applicationId === applicationId &&
          f.feeType?.toLowerCase().includes("admission") &&
          (
            f.status?.toLowerCase() === "success" ||
            f.status?.toLowerCase() === "paid"
          )
      );

      if (!admissionFeeRecord) {
        setLocked(true);
        return;
      }

      const categoryName =
        categories.find((c) => c.id === app.categoryId)?.name ?? "—";

      let degreeName = "—";
      let courseName = "—";

      try {
        const cds = await getCourseDetailsByApplicationId(applicationId);

        if (cds.length > 0) {
          const [deg, crs] = await Promise.all([
            getDegreeById(cds[0].degreeId),
            getCourseById(cds[0].courseId),
          ]);

          degreeName = deg.degreeName;
          courseName = crs.name;
        }
      } catch {}

      let photoUrl: string | undefined;

      try {
        const photo = await getApplicationPhoto(applicationId);

        if (photo?.photoUrl) {
          photoUrl = photo.photoUrl;
        }
      } catch {}

      setCard({
        appNo,
        name: app.name ?? "—",
        fatherName: app.fatherName ?? "—",
        category: categoryName,
        degreeName,
        courseName,
        academicYear: "2026–27",
        receiptNumber: admissionFeeRecord.receiptNumber ?? "—",
        photoUrl,
      });

    } catch {
      setMessage("Failed to load admit card details.");
    } finally {
      setFetching(false);
    }
  };

  load();
}, []);

  /* ─── Loading ─────────────────────────────────────────────────────────── */
  if (fetching) {
    return (
      <AppLayout pageTitle="Admit Card">
        <div className="flex items-center justify-center h-40 text-sm text-gray-400 animate-pulse">
          Loading admit card…
        </div>
      </AppLayout>
    );
  }

  /* ─── Error ───────────────────────────────────────────────────────────── */
  if (message) {
    return (
      <AppLayout pageTitle="Admit Card">
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">{message}</div>
      </AppLayout>
    );
  }

  /* ─── Locked — fee not paid ───────────────────────────────────────────── */
  if (locked) {
    return (
      <AppLayout pageTitle="Admit Card">
        <div className="pb-8">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-text">Admit Card</h1>
            <p className="text-gray-600 text-xs mt-1">Your official admission card</p>
          </div>
          <div className="flex flex-col items-center justify-center bg-white rounded-lg border border-gray-200 p-12 text-center gap-4">
            <div className="bg-gray-100 rounded-full p-4">
              <Lock size={32} className="text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Admit Card Locked</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Your admit card will be available once your Admission Fee payment is confirmed as successful.
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ─── Admit card ──────────────────────────────────────────────────────── */
  const d = card!;

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">{label}</p>
      <p className="text-xs font-bold text-text">{value}</p>
    </div>
  );

  return (
    <AppLayout pageTitle="Admit Card">

      {/* ── Print isolation ── */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }

          html, body {
            background: white !important;
            margin: 0 !important; padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * { visibility: hidden !important; }
          #admit-print-area,
          #admit-print-area * { visibility: visible !important; }

          #admit-print-area {
            position: absolute !important;
            top: 0 !important; left: 0 !important; right: 0 !important;
            padding: 0 !important; margin: 0 !important;
            background: white !important;
          }

          #admit-card {
            width: 185mm !important;
            margin: 0 auto !important;
            border-radius: 0 !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: 1px solid #d1d5db !important;
            background: white !important;
          }

          /* Header */
          #admit-card-header { padding: 10px 16px !important; }
          #admit-card-header * { font-size: 12px !important; color: white !important; }
          #admit-card-header h2 { font-size: 15px !important; }

          /* Body sections */
          #admit-card-body { padding: 10px 14px !important; }
          #admit-card-body * { font-size: 9.5px !important; line-height: 1.35 !important; }

          /* Photo box */
          #admit-photo-box { width: 85px !important; height: 110px !important; }

          /* Signatures */
          #admit-signatures { margin-top: 10px !important; }
          #admit-sig-box { min-height: 55px !important; padding: 6px !important; }

          /* Footer note */
          #admit-footer-note { padding: 6px 14px !important; }
          #admit-footer-note * { font-size: 7.5px !important; line-height: 1.4 !important; }

          button, .print\\:hidden { display: none !important; }

          #admit-card, table, tr, td {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div data-testid="admit-card-page" className="pb-8">

        {/* Page header — hidden on print */}
        <div className="mb-4 print:hidden">
          <h1 className="text-2xl font-bold text-text">Provisional Admit Card</h1>
          <p className="text-gray-600 text-xs mt-1">Your official admission card</p>
        </div>

        {/* Success banner — hidden on print */}
        <div className="bg-green-50 rounded-lg border border-green-200 p-3 mb-4 flex items-start gap-2 print:hidden">
          <div className="bg-green-100 rounded-full p-1.5 flex-shrink-0">
            <CheckCircle size={16} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-green-900 text-sm">Admission Confirmed</h3>
            <p className="text-xs text-green-800 mt-0.5">
              Admission fee paid · Receipt No: <span className="font-semibold">{d.receiptNumber}</span>
            </p>
          </div>
        </div>

        {/* ── THE ADMIT CARD (printed) ── */}
        <div id="admit-print-area">
          <div id="admit-card" className="bg-white rounded-lg border border-gray-300 overflow-hidden shadow-sm mb-6">

            {/* Header */}
            <div id="admit-card-header" className="bg-gradient-to-r from-primary to-primary/80 text-white p-3 text-center">
              <h2 className="text-lg font-bold tracking-wide">PROVISIONAL ADMIT CARD</h2>
              <p className="text-xs opacity-90 mt-0.5">
                Mahatma Gandhi Rural Development &amp; Panchayat Raj University, Gadag
              </p>
            </div>

            {/* Body */}
            <div id="admit-card-body" className="p-4">

              {/* Academic year strip */}
              <div className="text-center border-b border-gray-200 pb-2 mb-3">
                <p className="text-xs text-gray-500">
                  Academic Year: <span className="font-semibold text-text">{d.academicYear}</span>
                </p>
              </div>

              {/* Photo + Details grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

                {/* Photo */}
                <div className="flex flex-col items-center justify-start">
                  <div
                    id="admit-photo-box"
                    className="border-2 border-gray-300 rounded overflow-hidden flex items-center justify-center bg-gray-100"
                    style={{ width: 100, height: 130 }}
                  >
                    {d.photoUrl ? (
                      <img src={d.photoUrl} alt="Student" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400 text-center px-1">No Photo</span>
                    )}
                  </div>
                </div>

                {/* Student details */}
                <div className="space-y-2">
                  <Field label="Application No." value={d.appNo} />
                  <Field label="Student Name"    value={d.name} />
                  <Field label="Father’s Name"   value={d.fatherName} />
                  <Field label="Category"        value={d.category} />
                </div>

                {/* Academic details */}
                <div className="space-y-2">
                  <Field label="Degree"        value={d.degreeName} />
                  <Field label="Course"        value={d.courseName} />
                  <Field label="Academic Year" value={d.academicYear} />
                  <Field label="Receipt No."   value={d.receiptNumber} />
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 my-3" />

              {/* Signatures */}
              <div id="admit-signatures" className="grid grid-cols-3 gap-3 text-center">

                {/* Student */}
                <div>
                  <div
                    id="admit-sig-box"
                    className="bg-gray-50 border border-gray-300 rounded p-3 mb-1 flex items-end justify-center"
                    style={{ minHeight: 70 }}
                  />
                  <p className="text-xs font-semibold text-gray-700">Student</p>
                </div>

                {/* University Seal */}
                <div>
                  <div
                    id="admit-sig-box"
                    className="bg-gray-50 border border-gray-300 rounded p-3 mb-1 flex items-center justify-center"
                    style={{ minHeight: 70 }}
                  >
                    <span className="text-xs text-gray-400 font-medium">University Seal</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-700">Seal</p>
                </div>

                {/* Registrar */}
               <div className="text-right mt-6 leading-tight">
                <p className="text-sm italic text-gray-700">
                  Sd/-
                </p>

                <p className="text-sm font-semibold text-gray-900 mt-1">
                  Registrar
                </p>
              </div>
              </div>

              {/* Footer note */}
              <div id="admit-footer-note" className="border-t border-gray-200 mt-3 pt-2 text-center">
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  This is an official document. Please keep it safe.
                  Admission shall be confirmed only upon physical verification of the duly submitted online
                  admission application along with all uploaded original documents, by the University’s Admission Section.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Download — hidden on print */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 mb-4 flex items-center justify-between gap-3 print:hidden">
          <div>
            <h3 className="font-bold text-blue-900 text-sm">Download Admit Card</h3>
            <p className="text-xs text-blue-800 mt-0.5">Download as PDF and bring during admission</p>
          </div>
          <Button variant="primary" onClick={() => window.print()} className="flex-shrink-0 text-xs py-2">
            <Download size={16} />
            Download / Print
          </Button>
        </div>

        {/* Info tiles — hidden on print */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 print:hidden">
          {[
            { icon: <Building2 size={16} className="text-primary" />, title: "Report to College", desc: "Visit college with this card" },
            { icon: <Award     size={16} className="text-green-600" />, title: "All Fees Paid",    desc: "Admission fee confirmed" },
            { icon: <BookOpen  size={16} className="text-blue-600" />,  title: "Ready to Join",    desc: "Academic journey begins" },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-lg border border-gray-200 p-3 flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">{icon}</div>
              <div>
                <h4 className="font-semibold text-text text-xs mb-0.5">{title}</h4>
                <p className="text-xs text-gray-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Notes — hidden on print */}
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-3 print:hidden">
          <h4 className="font-bold text-yellow-900 mb-1 text-xs">Important</h4>
          <ul className="text-xs text-yellow-800 space-y-0.5">
            <li>✓ Carry this card during admission and report to the college</li>
            <li>✓ Valid for the mentioned academic year only</li>
            <li>✓ Contact the admissions office for any discrepancies</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
