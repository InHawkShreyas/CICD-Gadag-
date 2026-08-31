import { useState, useEffect } from "react";
import { Download, CheckCircle, Building2, BookOpen, Award, Lock } from "lucide-react";
import Button from "../../components/ui/Button";
import AppLayout from "../../components/layouts/AppLayout";
import Toast from "../../components/ui/Toast";
import { getApplications } from "../../services/applicationService";
import { getFullApplicationByAppNo } from "../../services/applicationQueryService";
import { getCourseDetailsByApplicationId } from "../../services/applicationCourseDetailService";
import { getCourseById } from "../../services/courseService";
import { getDegreeById } from "../../services/degreeService";
import { getLookupsByType } from "../../services/lookupService";
import { getAcademicYearById } from "../../services/academicYearService";
import { getApplicationPhoto, getApplicationPhotoFile, getApplicationSignatureFile } from "../../services/applicationPhotoService";

/* ─── Types ───────────────────────────────────────────────────────────────── */

type AdmitCardData = {
  appNo: string;
  name: string;
  fatherName: string;
  categoryName: string;
  degreeName: string;
  courseName: string;
  academicYear: string;
  photoUrl: string;
  signatureUrl: string;
  // TODO: these come from backend after admission approval
  admissionNumber: string;
  admissionDate: string;
  semester: string;
};

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function AdmitCardPage() {
  const [data, setData]         = useState<AdmitCardData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast]       = useState<{ message: string; type: "success" | "error" } | null>(null);

  // TODO: Replace with actual payment status from backend
  // Set to true once admission fee payment is confirmed by the backend
  const paymentSuccess = false;

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Load ───────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const apps = await getApplications();
        if (!apps.length) return;
        const { id: applicationId, appNo } = apps[0];

        const [fullResult, categories] = await Promise.all([
          getFullApplicationByAppNo(appNo),
          getLookupsByType("Category", ""),
        ]);

        const app = fullResult.application;

        const categoryName = categories.find((c) => c.id === app.categoryId)?.name ?? "—";

        let academicYear = "—";
        if (app.academicYearId) {
          try {
            const ay = await getAcademicYearById(app.academicYearId);
            academicYear = ay.description ?? "—";
          } catch { /* ignore */ }
        }

        let degreeName = "—";
        let courseName = "—";
        try {
          const courseDetails = await getCourseDetailsByApplicationId(applicationId);
          if (courseDetails.length) {
            const cd = courseDetails[0];
            const [degree, course] = await Promise.all([
              getDegreeById(cd.degreeId),
              getCourseById(cd.courseId),
            ]);
            degreeName = degree.degreeName;
            courseName = course.name;
          }
        } catch { /* ignore */ }

        let photoUrl    = "";
        let signatureUrl = "";
        try {
          const photoMeta = await getApplicationPhoto(applicationId);
          if (photoMeta.photoUrl) {
            const blob = await getApplicationPhotoFile(applicationId);
            photoUrl = URL.createObjectURL(blob);
          }
          if (photoMeta.signatureUrl) {
            const blob = await getApplicationSignatureFile(applicationId);
            signatureUrl = URL.createObjectURL(blob);
          }
        } catch { /* ignore */ }

        setData({
          appNo,
          name:        app.name,
          fatherName:  app.fatherName  ?? "—",
          categoryName,
          degreeName,
          courseName,
          academicYear,
          photoUrl,
          signatureUrl,
          // TODO: replace with backend response fields after admission approval
          admissionNumber: "—",
          admissionDate:   "—",
          semester:        "1st Semester",
        });
      } catch {
        showToast("Failed to load admit card details.", "error");
      } finally {
        setFetching(false);
      }
    };
    load();
  }, []);

  /* ── Download ───────────────────────────────────────────────────────────── */
  const handleDownload = () => {
    // TODO: generate PDF from backend or use window.print()
    window.print();
  };

  /* ── UI ─────────────────────────────────────────────────────────────────── */
  if (fetching) {
    return (
      <AppLayout pageTitle="Admit Card">
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading...</div>
      </AppLayout>
    );
  }

  /* ── Payment not yet confirmed ──────────────────────────────────────────── */
  if (!paymentSuccess) {
    return (
      <AppLayout pageTitle="Admit Card">
        <div className="space-y-4 pb-8">
          <div>
            <h1 className="text-2xl font-bold text-text">
              Admit Card
              <span className="text-gray-400 font-normal text-lg ml-2">(ಪ್ರವೇಶ ಪತ್ರ)</span>
            </h1>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-10 flex flex-col items-center justify-center text-center gap-4">
            <div className="bg-amber-100 rounded-full p-4">
              <Lock size={28} className="text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-text">Admit Card Not Available Yet</h2>
            <p className="text-sm text-gray-500 max-w-sm">
              Your admit card will be available once your admission fee payment is confirmed.
              Please complete the admission fee payment to unlock your admit card.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 max-w-sm w-full">
              Complete <strong>Admission Fee Payment</strong> → Admit card will be unlocked automatically.
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ── Admit card (payment confirmed) ─────────────────────────────────────── */
  return (
    <AppLayout pageTitle="Admit Card">
      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}

      <div className="space-y-4 pb-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-text">
            Admit Card
            <span className="text-gray-400 font-normal text-lg ml-2">(ಪ್ರವೇಶ ಪತ್ರ)</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Your official admission card — download and keep it safe.
          </p>
        </div>

        {/* ── Success banner ──────────────────────────────────────────────── */}
        <div className="bg-green-50 rounded-lg border border-green-200 p-4 flex items-start gap-3">
          <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-green-900">Admission Confirmed</h3>
            <p className="text-xs text-green-800 mt-0.5">
              Your admission has been confirmed. All fees have been paid. You are ready to join.
            </p>
          </div>
        </div>

        {/* ── Admit card document ─────────────────────────────────────────── */}
        <div id="admit-card-print" className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden shadow-sm">

          {/* Card header */}
          <div className="bg-primary text-white p-5 text-center">
            <h2 className="text-xl font-bold tracking-wide">ADMIT CARD</h2>
            <p className="text-xs opacity-80 mt-0.5">Official Admission Document · Gadag University</p>
          </div>

          <div className="p-6">
            {/* College name */}
            <div className="text-center border-b border-gray-200 pb-4 mb-5">
              <h3 className="text-base font-bold text-text">Gadag University</h3>
              <p className="text-xs text-gray-500">Gadag, Karnataka · Authorized Educational Institution</p>
            </div>

            {/* 3-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-5">

              {/* Photo */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="border-2 border-gray-300 rounded overflow-hidden bg-gray-100 flex items-center justify-center"
                  style={{ width: 120, height: 150 }}
                >
                  {data?.photoUrl ? (
                    <img src={data.photoUrl} alt="Student Photo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-400 text-center px-2">Photo</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">(Passport Photo)</p>
              </div>

              {/* Student details */}
              <div className="space-y-3">
                <CardField label="Application Number" value={data?.appNo ?? "—"} highlight />
                <CardField label="Admission Number"   value={data?.admissionNumber ?? "—"} />
                <CardField label="Student Name"       value={data?.name ?? "—"} />
                <CardField label="Father's Name"      value={data?.fatherName ?? "—"} />
                <CardField label="Category"           value={data?.categoryName ?? "—"} />
              </div>

              {/* Academic details */}
              <div className="space-y-3">
                <CardField label="Degree"          value={data?.degreeName ?? "—"} />
                <CardField label="Course"          value={data?.courseName ?? "—"} />
                <CardField label="Semester"        value={data?.semester ?? "—"} />
                <CardField label="Academic Year"   value={data?.academicYear ?? "—"} />
                <CardField label="Admission Date"  value={data?.admissionDate ?? "—"} />
              </div>
            </div>

            {/* Dashed divider */}
            <div className="border-t border-dashed border-gray-300 my-4" />

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 text-center">
              {/* Student signature */}
              <div>
                <div
                  className="border border-gray-200 rounded bg-gray-50 flex items-center justify-center overflow-hidden mb-2"
                  style={{ height: 80 }}
                >
                  {data?.signatureUrl ? (
                    <img src={data.signatureUrl} alt="Student Signature" className="max-h-full object-contain p-1" />
                  ) : (
                    <span className="text-xs text-gray-400">Signature</span>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-600">Student</p>
              </div>

              {/* College seal */}
              <div>
                <div
                  className="border border-gray-200 rounded bg-gray-50 flex items-center justify-center mb-2"
                  style={{ height: 80 }}
                >
                  <span className="text-gray-300 text-3xl">✦</span>
                </div>
                <p className="text-xs font-semibold text-gray-600">College Seal</p>
              </div>

              {/* Principal signature */}
              <div>
                <div
                  className="border border-gray-200 rounded bg-gray-50 flex items-center justify-center mb-2"
                  style={{ height: 80 }}
                >
                  <span className="text-xs text-gray-400">Principal</span>
                </div>
                <p className="text-xs font-semibold text-gray-600">Principal</p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 mt-5 pt-3 text-center">
              <p className="text-xs text-gray-500">
                Admission No: <strong>{data?.admissionNumber ?? "—"}</strong> · This is an official document of Gadag University. Please keep it safe.
              </p>
            </div>
          </div>
        </div>

        {/* ── Download ────────────────────────────────────────────────────── */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-blue-900">Download Your Admit Card</h3>
            <p className="text-xs text-blue-800 mt-0.5">Download as PDF and print it for admission formalities.</p>
          </div>
          <Button variant="primary" onClick={handleDownload} className="flex-shrink-0">
            <Download size={16} />
            Download PDF
          </Button>
        </div>

        {/* ── Info cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start gap-3">
            <Building2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-text mb-0.5">Report to College</p>
              <p className="text-xs text-gray-500">Bring this card on your admission date.</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start gap-3">
            <Award size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-text mb-0.5">All Fees Paid</p>
              <p className="text-xs text-gray-500">Admission fees have been successfully paid.</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start gap-3">
            <BookOpen size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-text mb-0.5">Ready to Join</p>
              <p className="text-xs text-gray-500">You are ready to start your academic journey.</p>
            </div>
          </div>
        </div>

        {/* ── Notes ───────────────────────────────────────────────────────── */}
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <h4 className="text-xs font-bold text-yellow-900 mb-2">Important Notes (ಪ್ರಮುಖ ಸೂಚನೆ)</h4>
          <ul className="text-xs text-yellow-800 space-y-1">
            <li>✓ Keep this admit card safe and bring it during admission reporting</li>
            <li>✓ Valid for the mentioned academic year only</li>
            <li>✓ Contact the college immediately in case of any discrepancies</li>
            <li>✓ Must be printed and presented during college admission</li>
          </ul>
        </div>

      </div>
    </AppLayout>
  );
}

/* ─── Helper ──────────────────────────────────────────────────────────────── */

function CardField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${highlight ? "text-primary" : "text-text"}`}>{value}</p>
    </div>
  );
}
