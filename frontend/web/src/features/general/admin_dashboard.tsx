import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  ShieldCheck,
  IndianRupee,
  UserCheck,
  ClipboardCheck,
  ArrowRight,
  LifeBuoy,
  Activity,
  Clock,
  GraduationCap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import AppLayout from "../../components/layouts/AppLayout";
import { getMenuByRole } from "../../components/layouts/layoutConfig";
import { getLoginByUsername } from "../../services/loginService";
import { getDocumentCoordinators, isCoordinatorMappingActive } from "../../services/documentCoordinatorService";
import { getLookupsByType } from "../../services/lookupService";
import { getApplications } from "../../services/applicationService";
import { getAllFeeCollections } from "../../services/feeCollectionService";
import { getAdmittedStudents } from "../../services/admitStudentService";
import { getExamApplications } from "../../services/examApplicationService";
import { getAuditLogs, type AuditLog } from "../../services/auditLogService";
import { getTickets } from "../../services/supportTicketService";
import { getAdmissionFeeStructures } from "../../services/admissionFeeStructureService";
import { getAllFeeCollectionManualsPaged } from "../../services/feecollectionmanualService";
import {
  getDocumentVerificationList,
  type DocumentVerificationListItemDto,
} from "../../services/applicationQueryService";
import { getCourses } from "../../services/courseService";
import { getDegrees } from "../../services/degreeService";

/* ============================================================
   HELPERS
   ============================================================ */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function formatINR(amount: number) {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(2)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Ticks once a minute so the header's date/time badge stays live without
 *  re-rendering the whole dashboard every second. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);
  return now;
}

const VERIFICATION_NAME_TO_STATUS: Record<string, "verified" | "pending" | "rejected"> = {
  "Accepted": "verified",
  "Rejected": "rejected",
  "Pending/On Hold": "pending",
};
function resolveVerificationStatus(raw?: string | null): "verified" | "pending" | "rejected" {
  if (!raw) return "pending";
  const trimmed = raw.trim();
  if (VERIFICATION_NAME_TO_STATUS[trimmed]) return VERIFICATION_NAME_TO_STATUS[trimmed];
  const lower = trimmed.toLowerCase();
  if (lower === "accepted") return "verified";
  if (lower === "rejected") return "rejected";
  return "pending";
}

/** Reads the app's actual `text-primary` colour at runtime so the chart's
 *  stroke/fill always matches the Tailwind theme token instead of a guessed hex. */
function usePrimaryColor(fallback = "#2563EB") {
  const [color, setColor] = useState(fallback);
  useEffect(() => {
    const probe = document.createElement("span");
    probe.className = "text-primary";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    if (computed) setColor(computed);
    document.body.removeChild(probe);
  }, []);
  return color;
}

/* ============================================================
   ROLE TYPES
   ============================================================ */

export type DashboardRole = "sysadmin" | "admin" | "document-admin";

const ROLE_LABEL: Record<DashboardRole, string> = {
  sysadmin: "System Administrator",
  admin: "College Administrator",
  "document-admin": "Document Administrator",
};

const ROLE_TAGLINE: Record<DashboardRole, string> = {
  sysadmin: "You hold the keys to the whole system today.",
  admin: "Admissions wait for no one — let's keep things moving.",
  "document-admin": "Every document tells a story. Let's get verifying.",
};

const ROLE_SALUTE: Record<DashboardRole, string> = {
  sysadmin: "Administrator",
  admin: "Registrar",
  "document-admin": "Reviewer",
};

function normalizeRole(rawName: string): DashboardRole | null {
  const n = rawName.trim().toLowerCase();
  if (!n) return null;
  if (n.includes("document")) return "document-admin";
  if (n.includes("sysadmin") || n.includes("system")) return "sysadmin";
  if (n.includes("college") || n === "admin") return "admin";
  return null;
}

type Tone = "emerald" | "amber" | "red" | "blue" | "purple";

const TONE_HEX: Record<Tone, string> = {
  emerald: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  blue: "#3B82F6",
  purple: "#9333EA",
};

const TONE_TEXT: Record<Tone, string> = {
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  red: "text-red-600",
  blue: "text-blue-600",
  purple: "text-purple-600",
};
function Donut({ data, size = 96 }: { data: { label: string; value: number; tone: Tone }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const hasData = total > 0;
  return (
    <div className="flex items-center gap-4">
      <div style={{ width: size, height: size }} className="relative shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={hasData ? data : [{ label: "None", value: 1, tone: "blue" as Tone }]}
              dataKey="value"
              nameKey="label"
              innerRadius={size * 0.33}
              outerRadius={size * 0.5}
              paddingAngle={hasData && data.filter((d) => d.value > 0).length > 1 ? 3 : 0}
              stroke="none"
            >
              {(hasData ? data : [{ label: "None", value: 1, tone: "blue" as Tone }]).map((d, i) => (
                <Cell key={i} fill={hasData ? TONE_HEX[d.tone] : "#E5E7EB"} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-text">{total}</span>
        </div>
      </div>
      <div className="flex flex-col min-w-0 gap-1">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TONE_HEX[d.tone] }} />
            <span className="truncate">{d.label}</span>
            <span className="ml-auto font-semibold text-text">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityRow({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0">
      <p className="text-xs font-medium truncate text-text">{primary}</p>
      <p className="text-[11px] text-gray-400 font-mono shrink-0">{secondary}</p>
    </div>
  );
}

type BentoCell = { key: string; weight: number; node: ReactNode };
function renderBentoRow(cells: (BentoCell | false | null | undefined)[], key: string) {
  const visible = cells.filter((c): c is BentoCell => Boolean(c));
  if (visible.length === 0) return null;
  return (
    <div key={key} className="overflow-hidden bg-gray-200 border border-gray-200 rounded-xl">
      <div className="grid gap-px" style={{ gridTemplateColumns: visible.map((c) => `${c.weight}fr`).join(" ") }}>
        {visible.map((c) => (
          <div key={c.key} className="bg-white">
            {c.node}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN DASHBOARD
   ============================================================ */

interface DashboardData {
  loading: boolean;
  totalApplications: number;
  verificationCounts: { accepted: number; pending: number; rejected: number };
  feeCounts: { success: number; pending: number; failed: number; refund: number };
  totalCollected: number;
  onlineCollected: number;
  manualCollected: number;
  monthlyFees: { month: string; amount: number }[];
  admittedCount: number;
  awaitingAdmissionCount: number;
  examCounts: { fullyApproved: number; academicOnly: number; pending: number };
  feeStructureCount: number;
  recentAudits: AuditLog[];
  openTickets: number;
  degreeTypeCount: number;
  degreeCount: number;
  courseCount: number;
  pendingByCourse: { course: string; count: number }[];
  pendingByDegreeType: {
    degreeTypeId: string;
    degreeType: string;
    count: number;
    degrees: {
      degreeId: string;
      degree: string;
      count: number;
      courses: { courseId: string; course: string; count: number }[];
    }[];
  }[];
  hasAssignments: boolean;
  coordinatorDegrees: string[];
  coordinatorCourses: string[];
}

export default function AdminDashboard({ role: roleOverride }: { role?: DashboardRole } = {}) {
  const [resolvedRole, setResolvedRole] = useState<DashboardRole | null>(roleOverride ?? null);
  const [roleResolving, setRoleResolving] = useState(!roleOverride);

  useEffect(() => {
    if (roleOverride) return; // explicit prop wins, skip the lookup
    let cancelled = false;

    const username = localStorage.getItem("username") ?? "";
    if (!username) {
      setRoleResolving(false);
      return;
    }

    Promise.all([getLoginByUsername(username), getLookupsByType("Role")])
      .then(([loginData, roles]) => {
        if (cancelled) return;
        const roleName = roles.find((r) => r.id === loginData.roleId)?.name ?? "";
        setResolvedRole(normalizeRole(roleName));
      })
      .catch((err) => {
        console.error("Failed to resolve user role:", err);
      })
      .finally(() => {
        if (!cancelled) setRoleResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roleOverride]);

  const role = roleOverride ?? resolvedRole;
  const isDocAdmin = role === "document-admin";
  const primaryColor = usePrimaryColor();
  const now = useNow();
  const [activePendingTab, setActivePendingTab] = useState<string | null>(null);
  const menu = role ? getMenuByRole(role) : [];
  const has = (id: string) => menu.some((m) => m.id === id);
  const findPath = (id: string) => menu.find((m) => m.id === id)?.path ?? "#";

  const [data, setData] = useState<DashboardData>({
    loading: true,
    totalApplications: 0,
    verificationCounts: { accepted: 0, pending: 0, rejected: 0 },
    feeCounts: { success: 0, pending: 0, failed: 0, refund: 0 },
    totalCollected: 0,
    onlineCollected: 0,
    manualCollected: 0,
    monthlyFees: [],
    admittedCount: 0,
    awaitingAdmissionCount: 0,
    examCounts: { fullyApproved: 0, academicOnly: 0, pending: 0 },
    feeStructureCount: 0,
    recentAudits: [],
    openTickets: 0,
    degreeTypeCount: 0,
    degreeCount: 0,
    courseCount: 0,
    pendingByCourse: [],
    pendingByDegreeType: [],
    hasAssignments: true,
    coordinatorDegrees: [],
    coordinatorCourses: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!role) return; // wait for role to resolve before fetching anything
      try {
        const wantApplications = has("application") || has("documentVerification");
        const wantVerification = has("documentVerification");
        const wantFees = has("feeCollection");
        const wantAdmit = has("admitStudents");
        const wantExam = has("examManagement") || isDocAdmin;
        const wantAudits = has("audits");
        const wantSupport = has("support");
        const wantFeeStructures = has("Admission Fee Master");
        const wantManualReceipts = has("receipt");
        const wantUniversityCounts = role === "sysadmin" || role === "admin";
        const wantDegreeScope = wantUniversityCounts || isDocAdmin || wantVerification;
        const wantCourses = wantVerification || wantDegreeScope;

        const username = localStorage.getItem("username") ?? "";

        const [
          applications,
          verifications,
          feeCollections,
          admittedStudents,
          examApplications,
          auditLogsResponse,
          tickets,
          feeStructures,
          manualReceipts,
          courses,
          degrees,
          degreeTypes,
          coordinatorMappings,
        ] = await Promise.all([
          wantApplications ? getApplications() : Promise.resolve([]),
          wantVerification ? getDocumentVerificationList() : Promise.resolve([]),
          wantFees ? getAllFeeCollections() : Promise.resolve([]),
          wantAdmit ? getAdmittedStudents() : Promise.resolve([]),
          wantExam ? getExamApplications() : Promise.resolve([]),
          wantAudits ? getAuditLogs(1, 3) : Promise.resolve({ totalCount: 0, items: [] }),
          wantSupport ? getTickets() : Promise.resolve([]),
          wantFeeStructures ? getAdmissionFeeStructures() : Promise.resolve([]),
          wantManualReceipts ? getAllFeeCollectionManualsPaged() : Promise.resolve([]),
          wantCourses ? getCourses() : Promise.resolve([]),
          wantDegreeScope ? getDegrees() : Promise.resolve([]),
          wantDegreeScope ? getLookupsByType("DegreeType") : Promise.resolve([]),
          isDocAdmin ? getDocumentCoordinators().catch(() => []) : Promise.resolve([]),
        ]);

        if (cancelled) return;
        const myMappings = isDocAdmin
          ? coordinatorMappings.filter((m) => m.username === username && isCoordinatorMappingActive(m.status))
          : [];
        const assignedDegreeIds = new Set(myMappings.map((m) => m.degreeId));
        const assignedCourseIds = new Set(myMappings.map((m) => m.courseId));
        const assignedPairKeys = new Set(myMappings.map((m) => `${m.degreeId}::${m.courseId}`));

        const scopedDegrees = isDocAdmin ? degrees.filter((d) => assignedDegreeIds.has(d.id)) : degrees;
        const scopedCourseNames = isDocAdmin
          ? courses.filter((c) => assignedCourseIds.has(c.id)).map((c) => c.name)
          : courses.map((c) => c.name);
        const hasAssignments = !isDocAdmin || myMappings.length > 0;

        const scopedVerifications =
          isDocAdmin
            ? verifications.filter((v) => v.degreeId && v.courseId && assignedPairKeys.has(`${v.degreeId}::${v.courseId}`))
            : verifications;

        const accepted = scopedVerifications.filter((v) => resolveVerificationStatus(v.verificationStatus) === "verified");
        const rejected = scopedVerifications.filter((v) => resolveVerificationStatus(v.verificationStatus) === "rejected");
        const pendingVerification = scopedVerifications.filter(
          (v) => resolveVerificationStatus(v.verificationStatus) === "pending"
        );

        const courseNameMap = Object.fromEntries(courses.map((c) => [c.id, c.name]));
        const pendingByCourseCounts = new Map<string, number>();
        pendingVerification.forEach((v: DocumentVerificationListItemDto) => {
          if (!v.courseId) return;
          const name = courseNameMap[v.courseId] ?? "Unassigned Course";
          pendingByCourseCounts.set(name, (pendingByCourseCounts.get(name) ?? 0) + 1);
        });
        const pendingByCourse = Array.from(pendingByCourseCounts, ([course, count]) => ({ course, count })).sort(
          (a, b) => b.count - a.count
        );

        // Same pending applications, grouped 3 levels deep — Degree Type →
        // Degree → Course — mirroring application_fee_master.tsx's
        // groupedByDegreeType so the dashboard tree reads the same way.
        const degreeNameMap = Object.fromEntries(degrees.map((d) => [d.id, d.degreeName]));
        const degreeTypeNameMap = Object.fromEntries(
          degreeTypes.map((dt) => [dt.id, dt.name ?? dt.type2 ?? "—"])
        );
        const degreeIdToDegreeTypeId = Object.fromEntries(
          degrees.map((d) => [d.id, d.degreeTypeId ?? ""])
        );
        const courseIdToDegreeId = Object.fromEntries(courses.map((c) => [c.id, c.degreeId]));

        // degreeTypeId -> degreeId -> courseId -> count
        const pendingTree = new Map<string, Map<string, Map<string, number>>>();
        pendingVerification.forEach((v: DocumentVerificationListItemDto) => {
          if (!v.courseId) return;
          const degreeId = v.degreeId || courseIdToDegreeId[v.courseId] || "";
          const degreeTypeId = degreeId ? (degreeIdToDegreeTypeId[degreeId] ?? "") : "";
          const dtKey = degreeTypeId || "unassigned";
          const dgKey = degreeId || "unassigned";
          if (!pendingTree.has(dtKey)) pendingTree.set(dtKey, new Map());
          const degMap = pendingTree.get(dtKey)!;
          if (!degMap.has(dgKey)) degMap.set(dgKey, new Map());
          const crsMap = degMap.get(dgKey)!;
          crsMap.set(v.courseId, (crsMap.get(v.courseId) ?? 0) + 1);
        });

        const pendingByDegreeType = Array.from(pendingTree.entries())
          .map(([degreeTypeId, degMap]) => {
            const degreesArr = Array.from(degMap.entries())
              .map(([degreeId, crsMap]) => {
                const coursesArr = Array.from(crsMap.entries())
                  .map(([courseId, count]) => ({
                    courseId,
                    course: courseNameMap[courseId] ?? "Unassigned Course",
                    count,
                  }))
                  .sort((a, b) => b.count - a.count);
                const degreeCount = coursesArr.reduce((s, c) => s + c.count, 0);
                return {
                  degreeId,
                  degree: degreeId ? (degreeNameMap[degreeId] ?? "—") : "Unassigned Degree",
                  count: degreeCount,
                  courses: coursesArr,
                };
              })
              .sort((a, b) => b.count - a.count);
            const typeCount = degreesArr.reduce((s, d) => s + d.count, 0);
            return {
              degreeTypeId,
              degreeType: degreeTypeId ? (degreeTypeNameMap[degreeTypeId] ?? "—") : "Unassigned Type",
              count: typeCount,
              degrees: degreesArr,
            };
          })
          .sort((a, b) => b.count - a.count);

        const successFees = feeCollections.filter((f) => (f.status ?? "").toUpperCase() === "SUCCESS");
        const onlineCollected = successFees.reduce((sum, f) => sum + (f.paidAmount ?? 0), 0);
        const manualCollected = manualReceipts.reduce((sum, r) => sum + (r.feeAmount ?? 0), 0);
        const totalCollected = onlineCollected + manualCollected;
        const currentYear = new Date().getFullYear();
        const monthlyFees = MONTHS.map((month, idx) => {
          const online = successFees
            .filter((f) => {
              if (!f.paymentDate) return false;
              const d = new Date(f.paymentDate);
              return d.getFullYear() === currentYear && d.getMonth() === idx;
            })
            .reduce((sum, f) => sum + (f.paidAmount ?? 0), 0);
          const manual = manualReceipts
            .filter((r) => {
              if (!r.paymentDate) return false;
              const d = new Date(r.paymentDate);
              return d.getFullYear() === currentYear && d.getMonth() === idx;
            })
            .reduce((sum, r) => sum + (r.feeAmount ?? 0), 0);
          return { month, amount: online + manual };
        });

        const admittedMap = new Map(admittedStudents.map((a) => [a.applicationId, a]));
        const admittedCount = accepted.filter(
          (v) => admittedMap.get(v.id)?.admitYn === true
        ).length;
        const awaitingAdmissionCount = accepted.length - admittedCount;
        const scopedApplicationIds = isDocAdmin ? new Set(scopedVerifications.map((v) => v.id)) : null;
        const scopedExamApplications = scopedApplicationIds
          ? examApplications.filter((e) => scopedApplicationIds.has(e.applicationNo))
          : examApplications;

        const fullyApproved = scopedExamApplications.filter(
          (e) => e.academicApproval && e.attendanceApproval && e.otherApproval
        ).length;
        const academicOnly = scopedExamApplications.filter(
          (e) => e.academicApproval && !(e.attendanceApproval && e.otherApproval)
        ).length;
        const pendingExam = scopedExamApplications.filter((e) => !e.academicApproval).length;

        setData({
          loading: false,
          totalApplications: isDocAdmin ? scopedVerifications.length : applications.length,
          verificationCounts: {
            accepted: accepted.length,
            pending: pendingVerification.length,
            rejected: rejected.length,
          },
          feeCounts: {
            success: successFees.length,
            pending: feeCollections.filter((f) => (f.status ?? "").toUpperCase() === "PENDING").length,
            failed: feeCollections.filter((f) => (f.status ?? "").toUpperCase() === "FAILED").length,
            refund: feeCollections.filter((f) => (f.status ?? "").toUpperCase() === "REFUND").length,
          },
          totalCollected,
          onlineCollected,
          manualCollected,
          monthlyFees,
          admittedCount,
          awaitingAdmissionCount: Math.max(0, awaitingAdmissionCount),
          examCounts: { fullyApproved, academicOnly, pending: pendingExam },
          feeStructureCount: feeStructures.length,
          recentAudits: auditLogsResponse.items,
          openTickets: tickets.filter((t) => t.statusName === "Open").length,
          degreeTypeCount: degreeTypes.length,
          degreeCount: degrees.length,
          courseCount: courses.length,
          pendingByCourse,
          pendingByDegreeType,
          hasAssignments,
          coordinatorDegrees: isDocAdmin ? scopedDegrees.map((d) => d.degreeName) : [],
          coordinatorCourses: isDocAdmin ? scopedCourseNames : [],
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
        if (!cancelled) setData((prev) => ({ ...prev, loading: false }));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    if (data.pendingByDegreeType.length === 0) return;
    const stillExists = data.pendingByDegreeType.some((dt) => dt.degreeTypeId === activePendingTab);
    if (!stillExists) setActivePendingTab(data.pendingByDegreeType[0].degreeTypeId);
  }, [data.pendingByDegreeType, activePendingTab]);

  // Safe to bail out now — every hook above has already run in a fixed order.
  if (!role) {
    return (
      <AppLayout pageTitle="Dashboard">
        <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
          {roleResolving
            ? "Loading dashboard…"
            : "Couldn't determine your role — please re-login, or contact an administrator if this persists."}
        </div>
      </AppLayout>
    );
  }

  const showFullPipeline = has("admitStudents") && has("feeCollection");
  const showUniversityCounts = role === "sysadmin" || role === "admin";
  const showAudits = has("audits") && role !== "admin";

  const showExamApproval = has("examManagement") || isDocAdmin;

  const pipelineStages = [
    { label: "Applications", value: data.totalApplications, icon: FileText },
    { label: "Verified", value: data.verificationCounts.accepted, icon: ShieldCheck },
    { label: "Fee Paid", value: data.feeCounts.success, icon: IndianRupee },
    { label: "Admitted", value: data.admittedCount, icon: UserCheck },
    { label: "Exam Approved", value: data.examCounts.fullyApproved, icon: ClipboardCheck },
  ];

  /* Command strip cells — KPIs (plain) and attention items (clickable,
     coloured) live in one hairline-divided panel instead of separate
     card grids. */
  type StripCell =
    | { kind: "kpi"; key: string; label: string; value: string }
    | { kind: "action"; key: string; label: string; value: number; tone: Tone; to: string; icon: typeof ShieldCheck };

  const stripCells: StripCell[] = [
    (has("application") || has("documentVerification")) && {
      kind: "kpi",
      key: "apps",
      label: "Total Applications",
      value: String(data.totalApplications),
    },
    isDocAdmin && {
      kind: "kpi",
      key: "coordDegrees",
      label: "Degrees Coordinated",
      value: String(data.coordinatorDegrees.length),
    },
    isDocAdmin && {
      kind: "kpi",
      key: "coordCourses",
      label: "Courses Coordinated",
      value: String(data.coordinatorCourses.length),
    },
    has("feeCollection") && {
      kind: "kpi",
      key: "collected",
      label: "Total Collected",
      value: formatINR(data.totalCollected),
    },
    has("admitStudents") && {
      kind: "kpi",
      key: "admitted",
      label: "Admitted Students",
      value: String(data.admittedCount),
    },
    has("Admission Fee Master") && {
      kind: "kpi",
      key: "feeStructures",
      label: "Fee Structures",
      value: String(data.feeStructureCount),
    },
    showUniversityCounts && {
      kind: "kpi",
      key: "degreeTypes",
      label: "Degree Types",
      value: String(data.degreeTypeCount),
    },
    showUniversityCounts && {
      kind: "kpi",
      key: "degrees",
      label: "Degrees",
      value: String(data.degreeCount),
    },
    showUniversityCounts && {
      kind: "kpi",
      key: "courses",
      label: "Courses",
      value: String(data.courseCount),
    },
    has("documentVerification") && {
      kind: "action",
      key: "verify",
      label: "Pending Verification",
      value: data.verificationCounts.pending,
      tone: "amber",
      to: findPath("documentVerification"),
      icon: ShieldCheck,
    },
    has("admitStudents") && {
      kind: "action",
      key: "admit",
      label: "Awaiting Admission",
      value: data.awaitingAdmissionCount,
      tone: "blue",
      to: findPath("admitStudents"),
      icon: UserCheck,
    },
    has("examManagement") && {
      kind: "action",
      key: "exam",
      label: "Exam Approvals Pending",
      value: data.examCounts.pending,
      tone: "amber",
      to: findPath("examManagement"),
      icon: ClipboardCheck,
    },
  ].filter(Boolean) as StripCell[];

  const stripCols = Math.min(stripCells.length, 5);

  return (
    <AppLayout pageTitle="Dashboard">
      <div data-testid="admin-dashboard" className="flex flex-col h-full gap-4 pb-2">
        {/* Header — role-based greeting, professional with a touch of warmth */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-500">
              {getGreeting()}, {ROLE_SALUTE[role]} 👋
            </p>
            <h1 className="text-2xl font-bold text-text">{ROLE_LABEL[role]}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{ROLE_TAGLINE[role]}</p>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
            <Clock size={16} className="text-blue-500" />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-text">
                {now.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              </p>
              <p className="text-xs font-bold text-blue-600 tabular-nums">
                {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
              </p>
            </div>
          </div>
        </div>

        {/* Coordinator scope banner — Document Admin only. Shown first, above
            everything else, so it's immediately clear which specific degrees
            and courses this dashboard's numbers are scoped to — same
            assignedPairs source document-verification.tsx uses for its own
            table (i.e. the Document Coordinator mapping, not a whole degree
            type). */}
        {isDocAdmin && (
          <div className="flex flex-wrap items-center gap-4 p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="flex items-center justify-center rounded-lg shrink-0 bg-primary/10 size-11">
              <GraduationCap size={22} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                Document Coordinator For
              </p>
              {data.loading ? (
                <div className="w-40 h-5 mt-1 bg-gray-100 rounded animate-pulse" />
              ) : !data.hasAssignments ? (
                <p className="text-sm font-semibold leading-tight text-amber-700">
                  You haven't been assigned any degrees or courses yet — kindly wait, or contact your admin.
                </p>
              ) : (
                <p className="text-lg font-bold leading-tight text-text">
                  {data.coordinatorDegrees.length} {data.coordinatorDegrees.length === 1 ? "Degree" : "Degrees"} Assigned
                </p>
              )}
              {!data.loading && data.coordinatorDegrees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {data.coordinatorDegrees.map((d) => (
                    <span
                      key={d}
                      className="px-2 py-0.5 text-xs font-medium border rounded-full text-primary bg-primary/5 border-primary/20"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {!data.loading && data.coordinatorCourses.length > 0 && (
              <p className="ml-auto text-xs text-gray-400 shrink-0">
                {data.coordinatorCourses.length} courses across{" "}
                {data.coordinatorDegrees.length === 1 ? "this degree" : "these degrees"}
              </p>
            )}
          </div>
        )}

        {/* Command strip — KPIs + actionable pendings, one panel, hairline dividers */}
        {stripCells.length > 0 && (
          <div className="overflow-hidden bg-gray-200 border border-gray-200 rounded-xl">
            <div
              className="grid grid-cols-2 gap-px sm:grid-cols-4"
              style={{ gridTemplateColumns: `repeat(${stripCols}, minmax(0,1fr))` }}
            >
              {stripCells.map((cell) =>
                cell.kind === "kpi" ? (
                  <div key={cell.key} className="px-4 py-3 bg-white">
                    <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">{cell.label}</p>
                    {data.loading ? (
                      <div className="w-12 h-5 mt-1 bg-gray-100 rounded animate-pulse" />
                    ) : (
                      <p className="text-lg font-bold text-text">{cell.value}</p>
                    )}
                  </div>
                ) : (
                  <Link
                    key={cell.key}
                    to={cell.to}
                    className="flex items-center justify-between gap-2 px-4 py-3 transition bg-white group hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">{cell.label}</p>
                      {data.loading ? (
                        <div className="w-8 h-5 mt-1 bg-gray-100 rounded animate-pulse" />
                      ) : (
                        <p className={`text-lg font-bold ${cell.value > 0 ? TONE_TEXT[cell.tone] : "text-text"}`}>
                          {cell.value}
                        </p>
                      )}
                    </div>
                    <ArrowRight
                      size={14}
                      className="transition-transform text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 shrink-0"
                    />
                  </Link>
                )
              )}
            </div>
          </div>
        )}

        {/* Admissions pipeline — real sequence, kept slim */}
        {showFullPipeline && (
          <div className="px-5 py-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-start overflow-x-auto">
              {pipelineStages.map((s, i) => (
                <Fragment key={s.label}>
                  <div className="flex flex-col items-center min-w-[96px] px-1">
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-full border-2 ${s.value > 0
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-gray-50 border-gray-200 text-gray-300"
                        }`}
                    >
                      <s.icon size={15} />
                    </div>
                    {data.loading ? (
                      <div className="w-8 h-5 mt-2 bg-gray-100 rounded animate-pulse" />
                    ) : (
                      <p className="mt-2 text-lg font-bold text-text">{s.value}</p>
                    )}
                    <p className="mt-0.5 text-[11px] font-medium text-center text-gray-500">{s.label}</p>
                  </div>
                  {i < pipelineStages.length - 1 && <div className="flex-1 h-0.5 mt-[22px] bg-gray-200 min-w-[16px]" />}
                </Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Row 1 — Fee Collection Trend, Verification Status, Admission
            Progress, Exam Approval Status. Weighted fr columns mean this
            always fills the full row width no matter which of the four a
            role actually has. */}
        {renderBentoRow(
          [
            has("feeCollection") && {
              key: "feeTrend",
              weight: 2,
              node: (
                <div className="h-full p-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-bold text-text">Fee Collection Trend</p>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{formatINR(data.totalCollected)}</p>
                      {has("receipt") && (
                        <p className="text-[10px] text-gray-400">
                          Online {formatINR(data.onlineCollected)} · Manual {formatINR(data.manualCollected)}
                        </p>
                      )}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={data.monthlyFees} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={primaryColor} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis
                        stroke="#9CA3AF"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: number) => formatINR(v)}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                      />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }}
                        formatter={(value: number) => [fmt(value), "Collected"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke={primaryColor}
                        strokeWidth={2}
                        fill="url(#feeGradient)"
                        dot={{ fill: "#fff", stroke: primaryColor, r: 2.5 }}
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ),
            },
            has("documentVerification") && {
              key: "verificationStatus",
              weight: 1,
              node: (
                <div className="flex flex-col justify-center h-full p-4">
                  <p className="mb-3 text-sm font-bold text-text">Verification Status</p>
                  <Donut
                    data={[
                      { label: "Accepted", value: data.verificationCounts.accepted, tone: "emerald" },
                      { label: "Pending", value: data.verificationCounts.pending, tone: "amber" },
                      { label: "Rejected", value: data.verificationCounts.rejected, tone: "red" },
                    ]}
                  />
                </div>
              ),
            },
            has("admitStudents") && {
              key: "admissionProgress",
              weight: 1,
              node: (
                <div className="flex flex-col justify-center h-full p-4">
                  <p className="mb-3 text-sm font-bold text-text">Admission Progress</p>
                  <Donut
                    data={[
                      { label: "Admitted", value: data.admittedCount, tone: "emerald" },
                      { label: "Awaiting", value: data.awaitingAdmissionCount, tone: "blue" },
                    ]}
                  />
                </div>
              ),
            },
            showExamApproval && {
              key: "examApproval",
              weight: 1,
              node: (
                <div className="flex flex-col justify-center h-full p-4">
                  <p className="mb-3 text-sm font-bold text-text">Exam Approval Status</p>
                  <Donut
                    data={[
                      { label: "Fully Approved", value: data.examCounts.fullyApproved, tone: "emerald" },
                      { label: "Academic Only", value: data.examCounts.academicOnly, tone: "blue" },
                      { label: "Pending", value: data.examCounts.pending, tone: "amber" },
                    ]}
                  />
                </div>
              ),
            },
          ],
          "row-fees"
        )}

        {/* Row 2 — Pending Verification by Course, spanning the full width on
            its own so long course lists have real room instead of a cramped
            scroll box. */}
        {has("documentVerification") && (
          <div className="overflow-hidden bg-white border border-gray-200 rounded-xl">
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-text">Pending Verification by Course</p>
                <Link
                  to={findPath("documentVerification")}
                  className="flex items-center gap-1 text-xs font-medium text-gray-400 transition hover:text-gray-600 group"
                >
                  Review in Document Verification
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
              {data.loading ? (
                <div className="mt-3 space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-1">
                      <div className="w-1/3 h-3 bg-gray-100 rounded animate-pulse" />
                      <div className="w-full h-2 bg-gray-100 rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : data.pendingByDegreeType.length === 0 ? (
                <p className="mt-3 text-xs text-gray-400">No pending verifications right now — all caught up.</p>
              ) : (
                (() => {
                  const activeType =
                    data.pendingByDegreeType.find((dt) => dt.degreeTypeId === activePendingTab) ??
                    data.pendingByDegreeType[0];
                  const maxCourseCount = Math.max(
                    1,
                    ...activeType.degrees.flatMap((dg) => dg.courses.map((c) => c.count))
                  );
                  return (
                    <>
                      {/* Degree Type tabs — total pending count per type, always
                          visible so switching between them takes one click and
                          nothing is hidden behind an accordion. */}
                      <div className="flex gap-1 mt-2 overflow-x-auto border-b border-gray-100">
                        {data.pendingByDegreeType.map((dt) => {
                          const active = dt.degreeTypeId === activeType.degreeTypeId;
                          return (
                            <button
                              key={dt.degreeTypeId}
                              type="button"
                              onClick={() => setActivePendingTab(dt.degreeTypeId)}
                              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition ${active
                                ? "border-amber-500 text-amber-700"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                                }`}
                            >
                              {dt.degreeType}
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md shrink-0 ${active ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                                  }`}
                              >
                                {dt.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Courses, grouped by degree (plain section headers, not
                          collapsible) and sorted by pending load — every count
                          at every level is visible without a single extra click. */}
                      <div className="pr-1 mt-3 space-y-4 overflow-y-auto max-h-80">
                        {activeType.degrees.map((dg) => (
                          <div key={dg.degreeId}>
                            <div className="flex items-baseline justify-between gap-2 mb-1.5">
                              <p className="text-xs font-bold tracking-wide text-gray-500 uppercase truncate">
                                {dg.degree}
                              </p>
                              <span className="text-[10px] font-semibold text-gray-400 shrink-0">
                                {dg.count} pending
                              </span>
                            </div>
                            <div className="space-y-2">
                              {dg.courses.map((c) => {
                                const pct = Math.max(4, Math.round((c.count / maxCourseCount) * 100));
                                return (
                                  <div key={c.courseId}>
                                    <div className="flex items-baseline justify-between gap-2 mb-1">
                                      <span className="text-xs font-medium text-gray-700 truncate">{c.course}</span>
                                      <span className="text-xs font-bold text-amber-600 shrink-0">{c.count}</span>
                                    </div>
                                    <div className="w-full h-1.5 overflow-hidden bg-gray-100 rounded-full">
                                      <div
                                        className="h-full transition-all rounded-full bg-amber-400"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          </div>
        )}

        {renderBentoRow(
          [
            has("support") && {
              key: "support",
              weight: 1,
              node: (
                <div className="flex flex-col justify-center h-full p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <LifeBuoy size={14} className="text-gray-400" />
                    <p className="text-sm font-bold text-text">Support Tickets</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    {data.loading ? (
                      <div className="w-10 h-8 bg-gray-100 rounded animate-pulse" />
                    ) : (
                      <span className={`text-3xl font-bold ${data.openTickets > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {data.openTickets}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">open right now</span>
                  </div>
                </div>
              ),
            },
            showAudits && {
              key: "audits",
              weight: 2,
              node: (
                <div className="flex flex-col justify-center h-full p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={14} className="text-gray-400" />
                    <p className="text-sm font-bold text-text">Recent Activity</p>
                  </div>
                  {data.recentAudits.length === 0 ? (
                    <p className="text-xs text-gray-400">No recent activity</p>
                  ) : (
                    <div>
                      {data.recentAudits.map((log, i) => (
                        <ActivityRow
                          key={i}
                          primary={`${log.performedBy ?? "System"} · ${log.action ?? "—"} · ${log.tableName ?? "—"}`}
                          secondary={
                            log.performedOn
                              ? new Date(log.performedOn).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                              : "—"
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              ),
            },
          ],
          "row-exam-support-audits"
        )}
      </div>
    </AppLayout>
  );
}