import { useState, useEffect } from "react";
import {
  CheckCircle, Clock, AlertCircle, Upload, CreditCard,
  FileCheck, Download, ArrowRight, User, BookOpen, Tag,
  Phone, Mail, Lightbulb,
} from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import AppLayout from "../../components/layouts/AppLayout";
import { getMyFullApplication } from "../../services/applicationQueryService";
import { getCourseDetailsByApplicationId } from "../../services/applicationCourseDetailService";
import { getCourseById } from "../../services/courseService";
import { getDegreeById } from "../../services/degreeService";
import { getLookupsByType } from "../../services/lookupService";
import { getApplicationPhoto } from "../../services/applicationPhotoService";
import { downloadMyApplicationPdf } from "../../services/reportService";
import { getApplicationFees } from "../../services/applicationFeeService";
import { getFeesByApplicationId } from "../../services/feeCollectionService";
import { getApplicationVerificationByAppNo } from "../../services/applicationVerificationService";
import { getRegistrationByUsername } from "../../services/registrationService";

/* ─── Types ───────────────────────────────────────────────────────────────── */

type StepStatus = "completed" | "in-progress" | "pending" | "rejected";

type Step = {
  id: number;
  title: string;
  description: string;
  status: StepStatus;
  icon: React.ReactNode;
  action?: { label: string; path: string };
  /** Overrides the generic "Done" badge label when status is "completed" —
   *  e.g. "Paid" for fee steps, so it's unambiguous at a glance. */
  completedLabel?: string;
  /** A short, practical tip shown only while this step is the current one —
   *  the one bit of "what should I actually do" copy per step. */
  tip?: string;
};

type DashboardData = {
  name: string;
  appNo: string;
  degreeName: string;
  courseName: string;
  categoryName: string;
  phone: string;
  email: string;
  applicationFee: number;
  // Checklist flags
  hasApplication: boolean;
  hasPhoto: boolean;
  appFeePaid: boolean;
  verificationStatus: string | null;
  admitted: boolean;
  admFeePaid: boolean;
  /** Mirrors the `hasUsn` flag used in getStudentMenu() — students who already
   *  have a USN are exempt from the application fee, so this step is skipped. */
  hasUsn: boolean;
  /** True only when hasUsn AND degree is Bachelor of Science AND the
   *  student's students-table academic year is "2023-2024" — the actual
   *  exemption rule, same as application_fee.tsx and AppLayout.tsx. */
  feeExempt: boolean;
};

/* ─── Static style tokens (kept static, never templated, so Tailwind's
       purge step can always see them) ───────────────────────────────────── */

const STEP_THEME: Record<StepStatus, { card: string; badge: string; node: string; line: string }> = {
  completed:     { card: "border-green-200 bg-green-50/60",  badge: "bg-green-100 text-green-800", node: "border-green-500 bg-green-500 text-white",  line: "bg-green-300" },
  "in-progress": { card: "border-blue-200 bg-blue-50/70 shadow-sm ring-1 ring-blue-100", badge: "bg-blue-100 text-blue-800",  node: "border-blue-500 bg-blue-500 text-white",   line: "bg-gray-200" },
  rejected:      { card: "border-red-200 bg-red-50/60",      badge: "bg-red-100 text-red-800",    node: "border-red-500 bg-red-500 text-white",      line: "bg-gray-200" },
  pending:       { card: "border-gray-200 bg-gray-50/50",    badge: "bg-gray-100 text-gray-500",  node: "border-gray-300 bg-white text-gray-400",    line: "bg-gray-200" },
};

const PANEL_THEME = {
  green: { border: "border-green-200", bg: "bg-green-50/70", bar: "bg-green-500", iconBg: "bg-green-100", iconText: "text-green-600", text: "text-green-800" },
  red:   { border: "border-red-200",   bg: "bg-red-50/70",   bar: "bg-red-500",   iconBg: "bg-red-100",   iconText: "text-red-600",   text: "text-red-800" },
  blue:  { border: "border-blue-200",  bg: "bg-blue-50/70",  bar: "bg-blue-500",  iconBg: "bg-blue-100",  iconText: "text-blue-600",  text: "text-blue-800" },
  amber: { border: "border-amber-200", bg: "bg-amber-50/70", bar: "bg-amber-500", iconBg: "bg-amber-100", iconText: "text-amber-600", text: "text-amber-900" },
  gray:  { border: "border-gray-200",  bg: "bg-gray-50/70",  bar: "bg-gray-300",  iconBg: "bg-gray-100",  iconText: "text-gray-400",  text: "text-gray-500" },
} as const;

const COLOR_STYLES: Record<string, { hoverBg: string; iconBg: string; iconText: string }> = {
  blue:   { hoverBg: "hover:bg-blue-50",   iconBg: "bg-blue-100",   iconText: "text-blue-600" },
  green:  { hoverBg: "hover:bg-green-50",  iconBg: "bg-green-100",  iconText: "text-green-600" },
  purple: { hoverBg: "hover:bg-purple-50", iconBg: "bg-purple-100", iconText: "text-purple-600" },
  orange: { hoverBg: "hover:bg-orange-50", iconBg: "bg-orange-100", iconText: "text-orange-600" },
  red:    { hoverBg: "hover:bg-red-50",    iconBg: "bg-red-100",    iconText: "text-red-600" },
  cyan:   { hoverBg: "hover:bg-cyan-50",   iconBg: "bg-cyan-100",   iconText: "text-cyan-600" },
};

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function StudentDashboard() {
  const username = localStorage.getItem("username") ?? "Student";
  const [info, setInfo]         = useState<DashboardData | null>(null);
  const [fetching, setFetching] = useState(true);

  /* ── Load ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const [fullResult, categories, reg] = await Promise.all([
          getMyFullApplication(),
          getLookupsByType("Category", ""),
          getRegistrationByUsername(username).catch(() => null),
        ]);

        // Same source AppLayout uses to compute hasUsn for the sidebar menu.
        const hasUsn = !!reg?.usnNo;

        const app = fullResult?.application;

        if (!app) {
          setInfo({
            name: username, appNo: "—",
            degreeName: "—", courseName: "—", categoryName: "—",
            phone: "—", email: "—", applicationFee: 0,
            hasApplication: false, hasPhoto: false,
            appFeePaid: false, verificationStatus: null, admitted: false, admFeePaid: false,
            hasUsn,
            feeExempt: false,
          });
          return;
        }

        const applicationId = app.id;
        const appNo         = app.appNo;
        const categoryName = categories.find((c) => c.id === app.categoryId)?.name ?? "—";

        let degreeName    = "—";
        let courseName    = "—";
        let applicationFee = 0;
        try {
          const courseDetails = await getCourseDetailsByApplicationId(applicationId);
          if (courseDetails.length) {
            const cd = courseDetails[0];
            const [degree, course, fees] = await Promise.all([
              getDegreeById(cd.degreeId),
              getCourseById(cd.courseId),
              getApplicationFees(),
            ]);
            degreeName     = degree.degreeName;
            courseName     = course.name;

            const matchedFee = fees.find(
              (f) =>
                f.degreeId === cd.degreeId &&
                f.courseId === cd.courseId &&
                (!app.categoryId || f.categoryId === app.categoryId) &&
                (!app.academicYearId || f.academicYearId === app.academicYearId)
            );
            applicationFee = matchedFee?.totalAmount ?? 0;
          }
        } catch { /* not yet filled */ }

        let hasPhoto = false;
        try {
          const photo = await getApplicationPhoto(applicationId);
          hasPhoto = !!(photo?.photoUrl);
        } catch { /* not yet uploaded */ }

        let appFeePaid = false;
        let admFeePaid = false;
        try {
          const fees = await getFeesByApplicationId(applicationId);
          appFeePaid = fees.some(
            (f) =>
              (f.feeType ?? "").toLowerCase().includes("application fee") &&
              (f.status ?? "").toUpperCase() === "SUCCESS",
          );
          admFeePaid = fees.some(
            (f) =>
              (f.feeType ?? "").toLowerCase().includes("admission fee") &&
              (f.status ?? "").toUpperCase() === "SUCCESS",
          );
        } catch { /* no payments yet */ }

        let verificationStatus: string | null = null;
        try {
          const verif = await getApplicationVerificationByAppNo(appNo);
          verificationStatus = verif?.verificationStatus ?? null;
        } catch { /* not yet verified */ }

        // Same rule as application_fee.tsx / AppLayout.tsx: exempt only when
        // hasUsn AND degree is Bachelor of Science AND the students-table
        // academic year is "2023-2024".
        const feeExempt =
          hasUsn &&
          degreeName.trim().toLowerCase() === "bachelor of science" &&
          reg?.academicYearDescription?.trim() === "2023-2024";

        setInfo({
          name:         app.name || username,
          appNo,
          degreeName,
          courseName,
          categoryName,
          phone:        app.phone ?? "—",
          email:        app.email ?? "—",
          applicationFee,
          hasApplication: true,
          hasPhoto,
          appFeePaid,
          verificationStatus,
          admitted:    verificationStatus === "Accepted",
          admFeePaid,
          hasUsn,
          feeExempt,
        });
      } catch {
        setInfo(null);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [username]);

  /* ── Build steps dynamically ──────────────────────────────────────────── */
  const buildSteps = (d: DashboardData): Step[] => {
    const done  = (s: boolean): StepStatus => s ? "completed" : "pending";
    const first = (conditions: boolean[]): StepStatus => {
      for (let i = 0; i < conditions.length; i++) {
        if (!conditions[i]) return i === 0 ? "in-progress" : "pending";
      }
      return "completed";
    };

    // Build the full list first (id left as a placeholder — it's reassigned
    // below once the skipped steps are dropped, so numbering always stays
    // contiguous no matter which steps are hidden).
    const allSteps: (Step & { skip?: boolean })[] = [
      {
        id: 0,
        title: "Fill Application Details",
        description: "Complete personal details, education, seat & degree selection.",
        status: d.hasApplication ? "completed" : "in-progress",
        icon: <Upload size={16} />,
        action: { label: d.hasApplication ? "View Application" : "Fill Now", path: "/student/application" },
        tip: "Keep your SSLC/12th marks card handy — you'll need the exact register number.",
      },
      {
        id: 0,
        title: "Upload Photos & Signatures",
        description: "Upload your passport photo, student signature and parent signature.",
        status: !d.hasApplication ? "pending" : d.hasPhoto ? "completed" : "in-progress",
        icon: <User size={16} />,
        action: { label: d.hasPhoto ? "View Photos" : "Upload Now", path: "/student/photo" },
        tip: "White background, under 200KB, JPEG or PNG — plain scans get rejected most often.",
      },
      {
        id: 0,
        title: "Pay Application Fee",
        description: d.appFeePaid
          ? `Application fee of ₹${d.applicationFee.toLocaleString()} has been paid.`
          : `Pay ₹${d.applicationFee.toLocaleString()} application fee to proceed.`,
        status: first([d.hasApplication && d.hasPhoto, d.appFeePaid]),
        completedLabel: "Paid",
        icon: <CreditCard size={16} />,
        action: { label: "Pay Now", path: "/student/application-fee" },
        tip: "Save the payment receipt — you'll need it if verification ever asks for proof.",
        // Same rule as getStudentMenu()/application_fee.tsx: exempt only
        // when hasUsn AND degree is B.Sc AND academic year is 2023-2024 —
        // hide this step entirely for that case, otherwise still show it.
        skip: d.feeExempt,
      },
      {
        id: 0,
        title: "Document Verification",
        description:
          d.verificationStatus === "Accepted"  ? "Your documents have been verified and accepted." :
          d.verificationStatus === "Rejected"  ? "Your application has been rejected. Please contact the admissions office." :
          d.verificationStatus               ? `Status: ${d.verificationStatus}. Our team is reviewing your documents.` :
          "Our team will verify your documents and information.",
        status:
          d.verificationStatus === "Accepted" ? "completed" :
          d.verificationStatus === "Rejected" ? "rejected" :
          d.verificationStatus               ? "in-progress" :
          "pending",
        completedLabel: "Verified",
        icon: <FileCheck size={16} />,
        tip: "This usually takes 5–7 business days — no action needed from you right now.",
      },
      {
        id: 0,
        title: "Admission Decision",
        description:
          d.admitted ? "Congratulations! You have been admitted." :
          "You will receive your admission decision once documents are verified.",
        status: done(d.admitted),
        icon: <CheckCircle size={16} />,
      },
      {
        id: 0,
        title: "Pay Admission Fee",
        description: d.admFeePaid
          ? "Your admission fee has been paid."
          : "Complete the admission fee to finalise your enrollment.",
        status: done(d.admFeePaid),
        completedLabel: "Paid",
        icon: <CreditCard size={16} />,
        action: { label: "Pay Now", path: "/student/admission-fee" },
        tip: "Fees are non-refundable once paid — double-check your course before you pay.",
      },
      {
        id: 0,
        title: "Download Admit Card",
        description: "Download your official admit card once all fees are paid.",
        status: done(d.admFeePaid),
        icon: <Download size={16} />,
        action: { label: "Download", path: "/student/admit-card" },
        tip: "Print two copies — one for your records, one to hand in on the first day.",
      },
    ];

    return allSteps
      .filter((s) => !s.skip)
      .map((s, idx) => ({ ...s, id: idx + 1 }));
  };

  const steps     = info ? buildSteps(info) : [];
  const completed = steps.filter((s) => s.status === "completed" || s.status === "rejected").length;
  const progress  = steps.length ? Math.round((completed / steps.length) * 100) : 0;
  const current   = steps.find((s) => s.status === "in-progress");

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  const handleDownload = async () => {
    if (!info?.appNo || info.appNo === "—") return;
    await downloadMyApplicationPdf();
  };

  const statusLabel = (step: Step) =>
    step.status === "completed" ? (step.completedLabel ?? "Done")
    : step.status === "rejected" ? "Rejected"
    : step.status === "in-progress" ? "In Progress"
    : "Pending";

  const docTheme =
    info?.verificationStatus === "Accepted" ? PANEL_THEME.green
    : info?.verificationStatus === "Rejected" ? PANEL_THEME.red
    : info?.verificationStatus ? PANEL_THEME.blue
    : PANEL_THEME.gray;

  const actionTheme = current ? PANEL_THEME.amber : PANEL_THEME.green;

  /* ── UI ───────────────────────────────────────────────────────────────── */
  return (
    <AppLayout pageTitle="Dashboard">
      <div data-testid="student-dashboard" className="pb-10 space-y-5">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden border rounded-2xl border-primary/15 bg-gradient-to-br from-primary/[0.06] via-white to-primary/[0.09] p-5 sm:p-7">
          <div className="absolute w-64 h-64 rounded-full pointer-events-none -right-20 -top-20 bg-primary/10 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-wider uppercase text-primary/70">Admission Dashboard</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl text-text">
                {fetching ? (
                  <span className="inline-block w-48 h-8 align-middle bg-gray-100 rounded animate-pulse" />
                ) : (
                  <>
                    Welcome, {info?.name ?? username}
                    <span className="ml-2 text-base font-normal text-gray-400 sm:text-lg">(ಸ್ವಾಗತ)</span>
                  </>
                )}
              </h1>
              <p className="mt-1 text-sm text-gray-500">Here's your admission progress and what to do next.</p>
              {!fetching && info?.hasApplication && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 text-xs font-semibold rounded-full border border-primary/20 bg-white/70 text-primary">
                  <Tag size={12} /> App No: {info.appNo}
                </div>
              )}
            </div>

            <div className="flex items-center gap-5 shrink-0">
              {fetching ? (
                <div className="rounded-full w-[92px] h-[92px] bg-gray-100 animate-pulse shrink-0" />
              ) : (
                <CircularProgress percent={progress} />
              )}
              <div className="hidden sm:block">
                {fetching ? (
                  <div className="w-32 space-y-2">
                    <div className="w-full h-4 bg-gray-100 rounded animate-pulse" />
                    <div className="w-2/3 h-3 bg-gray-100 rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-text">{completed} of {steps.length} steps done</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {current ? `Next: ${current.title}` : "All steps complete"}
                    </p>
                    {info && (
                      <Button onClick={handleDownload} variant="outline" className="mt-3">
                        <Download size={14} /> Download Application
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {!fetching && info && (
            <Button onClick={handleDownload} variant="outline" className="w-full mt-5 sm:hidden">
              <Download size={14} /> Download Application
            </Button>
          )}
        </div>

        {/* ── At-a-glance panels ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Panel
            testId="action-required-card"
            theme={actionTheme}
            label="Action Required"
            icon={<AlertCircle size={14} className={actionTheme.iconText} />}
            title={fetching ? undefined : current ? current.title : "All steps complete"}
            description={fetching ? undefined : current ? current.description : "Nothing outstanding right now — nice work."}
            loading={fetching}
          />

          <Panel
            testId="document-status-card"
            theme={docTheme}
            label="Document Status"
            icon={<FileCheck size={14} className={docTheme.iconText} />}
            title={
              fetching ? undefined
              : info?.verificationStatus === "Accepted" ? "Verified"
              : info?.verificationStatus === "Rejected" ? "Rejected"
              : info?.verificationStatus ?? "Not yet reviewed"
            }
            description={
              fetching ? undefined
              : info?.verificationStatus === "Accepted" ? "Your documents have been verified."
              : info?.verificationStatus === "Rejected" ? "Please contact the admissions office."
              : info?.verificationStatus ? "Our team is reviewing your documents."
              : "Submit your application to begin verification."
            }
            loading={fetching}
          />

          <div className="relative p-4 pl-5 overflow-hidden bg-white border border-gray-200 rounded-xl">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/70" />
            <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-gray-500">
              <User size={13} /> Applicant Info
            </div>
            {fetching ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <div key={i} className="w-full h-3 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Tag size={12} className="flex-shrink-0 text-primary" />
                  <span className="text-xs text-gray-500">App No:</span>
                  <span className="text-xs font-bold truncate text-primary">{info?.appNo ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen size={12} className="flex-shrink-0 text-gray-400" />
                  <span className="text-xs text-gray-600 truncate">{info?.degreeName ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileCheck size={12} className="flex-shrink-0 text-gray-400" />
                  <span className="text-xs text-gray-600 truncate">{info?.courseName ?? "—"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Contact strip ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-white border border-gray-200 rounded-xl sm:grid-cols-3">
          <InfoCell icon={<Phone size={12} />} label="Mobile" value={info?.phone} loading={fetching} />
          <InfoCell icon={<Mail size={12} />}  label="Email"  value={info?.email} loading={fetching} />
          <InfoCell icon={<Tag size={12} />}   label="Category" value={info?.categoryName} loading={fetching} />
        </div>

        {/* ── Current-step tip ─────────────────────────────────────────────── */}
        {!fetching && current?.tip && (
          <div className="flex items-start gap-2.5 p-3.5 border rounded-xl border-amber-200 bg-amber-50/70">
            <Lightbulb size={15} className="mt-0.5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Tip for "{current.title}": </span>
              {current.tip}
            </p>
          </div>
        )}

        {/* ── Steps timeline ────────────────────────────────────────────────── */}
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-text">Admission Process</h2>
            {!fetching && <span className="text-xs font-medium text-gray-400">{completed}/{steps.length} complete</span>}
          </div>

          {fetching ? (
            <div className="space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3.5">
                  <div className="bg-gray-100 rounded-full w-9 h-9 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-1/3 h-4 bg-gray-100 rounded animate-pulse" />
                    <div className="w-2/3 h-3 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {steps.map((step, idx) => {
                const theme = STEP_THEME[step.status];
                const isLast = idx === steps.length - 1;
                return (
                  <div key={step.id} className="flex gap-3.5">
                    {/* Rail */}
                    <div className="flex flex-col items-center">
                      <div className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${theme.node}`}>
                        {step.status === "completed" ? <CheckCircle size={16} />
                          : step.status === "rejected" ? <AlertCircle size={16} />
                          : step.status === "in-progress" ? <Clock size={16} className="motion-safe:animate-pulse" />
                          : <span className="text-xs font-bold">{step.id}</span>}
                      </div>
                      {!isLast && <div className={`w-0.5 flex-1 my-0.5 ${theme.line}`} />}
                    </div>

                    {/* Card */}
                    <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-4"}`}>
                      <div data-testid={`step-${step.id}`} className={`rounded-xl border p-3.5 ${theme.card} transition-colors`}>
                        <div className="flex items-center flex-wrap gap-2 mb-0.5">
                          <span className="text-xs font-medium text-gray-400">Step {step.id}</span>
                          <span className="text-sm font-bold text-text">{step.title}</span>
                          {step.status === "in-progress" && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-600 text-white">
                              You are here
                            </span>
                          )}
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${theme.badge}`}>
                            {statusLabel(step)}
                          </span>
                        </div>
                        <p className="mb-1.5 text-xs text-gray-500">{step.description}</p>
                        {step.action && step.status !== "completed" && step.status !== "rejected" && (
                          <Link to={step.action.path}>
                            <Button variant="primary" className="h-auto px-2.5 py-1 text-xs">
                              {step.action.label}
                              <ArrowRight size={11} />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Instructions ──────────────────────────────────────────────────── */}
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <h2 className="mb-4 text-sm font-bold text-text">Important Instructions (ಪ್ರಮುಖ ಸೂಚನೆ)</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { icon: Upload,      color: "blue",   title: "Upload Documents",     desc: "Upload clear documents: Aadhar, mark sheets, income certificate." },
              ...(info?.feeExempt ? [] : [
                { icon: CreditCard, color: "green",  title: "Pay Application Fee", desc: "Pay application fee using any payment method." },
              ]),
              { icon: FileCheck,   color: "purple", title: "Document Verification",desc: "Verification takes 5–7 business days after submission." },
              { icon: CheckCircle, color: "orange", title: "Complete Admission",   desc: "Pay admission fee and download your admit card." },
              { icon: AlertCircle, color: "red",     title: "File Requirements",   desc: "JPEG / PNG / PDF format, max 5 MB per file." },
              { icon: Download,    color: "cyan",   title: "Need Help?",           desc: "Contact our support team for any assistance." },
            ].map(({ icon: Icon, color, title, desc }) => {
              const c = COLOR_STYLES[color];
              return (
                <div key={title} className={`flex gap-2.5 rounded-lg p-2.5 -m-0.5 transition-colors ${c.hoverBg}`}>
                  <div className={`flex-shrink-0 h-fit rounded-lg p-1.5 ${c.iconBg}`}>
                    <Icon size={14} className={c.iconText} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-0.5 text-text">{title}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

/** The dashboard's signature element: an animated ring that shows admission
 *  progress at a glance, so the student never has to add it up from the list
 *  of steps below. */
function CircularProgress({ percent, size = 92 }: { percent: number; size?: number }) {
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="text-gray-100" stroke="currentColor" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none text-primary"
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-primary">{percent}%</span>
        <span className="text-[10px] font-medium text-gray-400">complete</span>
      </div>
    </div>
  );
}

type PanelTheme = typeof PANEL_THEME[keyof typeof PANEL_THEME];

function Panel({
  theme, icon, label, title, description, testId, loading,
}: {
  theme: PanelTheme;
  icon: React.ReactNode;
  label: string;
  title?: string;
  description?: string;
  testId?: string;
  loading?: boolean;
}) {
  return (
    <div data-testid={testId} className={`relative overflow-hidden rounded-xl border ${theme.border} ${theme.bg} p-4 pl-5`}>
      <div className={`absolute left-0 top-0 h-full w-1 ${theme.bar}`} />
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-500">{label}</span>
        <div className={`rounded-full p-1.5 ${theme.iconBg}`}>{icon}</div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="w-2/3 h-4 bg-gray-100 rounded animate-pulse" />
          <div className="w-full h-3 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className={`text-sm font-bold ${theme.text} line-clamp-1`}>{title}</p>
          {description && <p className="mt-1 text-xs text-gray-400 line-clamp-2">{description}</p>}
        </>
      )}
    </div>
  );
}

function InfoCell({ icon, label, value, loading }: { icon?: React.ReactNode; label: string; value?: string; loading?: boolean }) {
  return (
    <div>
      <p className="flex items-center gap-1 mb-0.5 text-xs font-medium tracking-wide text-gray-400 uppercase">
        {icon} {label}
      </p>
      {loading ? (
        <div className="w-20 h-4 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className="text-sm font-semibold truncate text-text">{value ?? "—"}</p>
      )}
    </div>
  );
}