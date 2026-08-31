import {
  LayoutDashboard,
  FileText,
  Image,
  Folder,
  CreditCard,
  FileCheck,
  UserCheck,
  BarChart3,
  Users,
  ShieldCheck,
  Wallet,
  ClipboardList,
  University,
  Send,
  Download,
  GraduationCap,
  CalendarRange,
  ReceiptIndianRupee,
  type LucideIcon
} from "lucide-react";

import type { AcademicDate } from "../../services/academicDateService";

/* ---------------- TYPES ---------------- */

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  disabled?: boolean;
}

/* ---------------- DATE HELPER (STRICT) ---------------- */

const isActive = (start?: string, end?: string) => {
  if (!start || !end) return false;

  const now = new Date();

  const startDate = new Date(start);
  const endDate = new Date(end);

  // 🔥 VERY IMPORTANT → allow full end date till 23:59:59
  endDate.setHours(23, 59, 59, 999);

  return now >= startDate && now <= endDate;
};

/* ---------------- MENU ↔ DATE MAPPING ---------------- */

const menuDateMap: Record<string, string> = {
  application: "ADMISSION_WINDOW",
  photos: "ADMISSION_WINDOW",
  documents: "ADMISSION_WINDOW",

  applicationFee: "FEE_PAYMENT_WINDOW",
  admissionFee: "FEE_PAYMENT_WINDOW",

  admitCard: "ADMISSION_WINDOW",
};

/* ---------------- STUDENT MENU BASE ---------------- */

const studentMenuBase: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/student", icon: LayoutDashboard },
  { id: "application", label: "Application", path: "/student/application", icon: FileText },
  { id: "photos", label: "Photos", path: "/student/photos", icon: Image },
  { id: "documents", label: "Documents", path: "/student/documents", icon: Folder },
  { id: "applicationFee", label: "Application Fee", path: "/student/application-fee", icon: CreditCard },
  { id: "admissionFee", label: "Admission Fee", path: "/student/admission-fee", icon: CreditCard },
  { id: "manualFeeReceipt", label: "My Receipts", path: "/student/manual-fee-receipt", icon: ReceiptIndianRupee },
  { id: "admitCard", label: "Download Admit Card", path: "/student/admit-card", icon: Download },
  { id: "support", label: "Support", path: "/student/support", icon: Send },
];

const examStudentMenu: MenuItem[] = [
  { id: "examApplication", label: "Exam Application", path: "/student/exam-application", icon: FileCheck },
  { id: "examFeePayment", label: "Exam Fee Payment", path: "/student/exam-fee-payment", icon: Wallet },
  { id: "support", label: "Support", path: "/student/support", icon: Send },
];

/* ---------------- APPLY DATE LOGIC ---------------- */

// Existing students (hasUsn) are exempt from the application fee, but only
// for Bachelor of Science — other degrees still need to pay it even with a USN.
const isBScDegree = (degreeName?: string) =>
  (degreeName ?? "").trim().toLowerCase() === "bachelor of science";

export const getStudentMenu = (
  dates: AcademicDate[],
  hasUsn = false,
  examRegistration = false,
  degreeName?: string
): MenuItem[] => {
  if (examRegistration) return examStudentMenu;

  const exemptFromApplicationFee = hasUsn && isBScDegree(degreeName);

  const base = exemptFromApplicationFee
    ? studentMenuBase.filter((m) => m.id !== "applicationFee")
    : studentMenuBase;

  return base.map((menu) => {
    const requiredCode = menuDateMap[menu.id];

    // ✅ No restriction → allow
    if (!requiredCode) return menu;

    const date = dates.find(
      (d) => d.name === requiredCode && d.status !== false
    );

    // ❌ If no config → BLOCK
    if (!date) {
      return { ...menu, disabled: true };
    }

    const active = isActive(date.startDate, date.endDate);

    return {
      ...menu,
      disabled: !active, // 🔥 BLOCK if expired
    };
  });
};

/* ---------------- ADMIN MENUS ---------------- */

const systemAdminMenu: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { id: "documentVerification", label: "Document Verification", path: "/admin/document-verification", icon: FileCheck },
  { id: "documentCoordinator", label: "Coordinator Allocation", path: "/admin/coordinator-allocation", icon: FileCheck },
  { id: "feeCollection", label: "Fee Collection", path: "/admin/fee-collection", icon: Wallet },
  { id: "Admission Fee Master", label: "Admission Fee Master", path: "/admin/admission-fee-master", icon: ClipboardList },
  { id: "admitStudents", label: "Admit Students", path: "/admin/admit-students", icon: UserCheck },
  { id: "receipt", label: "Receipt Entry", path: "/admin/receipt", icon: Download },
  { id: "hallTicket", label: "Hall Ticket", path: "/admin/hall-ticket", icon: GraduationCap },
  { id: "applicationFee", label: "Manage Application Fees", path: "/admin/application-fee", icon: CalendarRange },
  { id: "examFee", label: "Manage Exam Fee", path: "/admin/exam-fee", icon: CalendarRange },
  { id: "examManagement", label: "Exam Management", path: "/admin/exam-approval", icon: ClipboardList },
  { id: "universityManagement", label: "University Management", path: "/admin/university-management", icon: University },
  { id: "audits", label: "Audits", path: "/admin/audits", icon: ShieldCheck },
  { id: "reports", label: "Reports", path: "/admin/reports", icon: BarChart3 },
  { id: "support", label: "Support", path: "/admin/support", icon: Users },
];

const documentAdminMenu: MenuItem[] = [

  {

    id: "dashboard",

    label: "Dashboard",

    path: "/admin/dashboard",

    icon: LayoutDashboard,

  },

  {

    id: "documentVerification",

    label: "Document Verification",

    path: "/admin/document-verification",

    icon: FileCheck,

  },

];
const collegeAdminMenu: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "documentVerification",
    label: "Document Verification",
    path: "/admin/document-verification",
    icon: FileCheck,
  },
  { id: "documentCoordinator", 
    label: "Coordinator Allocation", 
    path: "/admin/coordinator-allocation", 
    icon: FileCheck 
  },
  {
    id: "feeCollection",
    label: "Fee Collection",
    path: "/admin/fee-collection",
    icon: Wallet,
  },
  { 
    id: "Admission Fee Master", 
    label: "Admission Fee Master", 
    path: "/admin/admission-fee-master", 
    icon: ClipboardList 
  },
  { 
    id: "applicationFee", 
    label: "Manage Application Fees", 
    path: "/admin/application-fee", 
    icon: CalendarRange 
  },
  { 
    id: "examFee", 
    label: "Manage Exam Fee", 
    path: "/admin/exam-fee", 
    icon: CalendarRange 
  },
  {
    id: "admitStudents",
    label: "Admit Students",
    path: "/admin/admit-students",
    icon: UserCheck,
  },
  {
    id: "receipt",
    label: "Receipt Entry",
    path: "/admin/receipt",
    icon: Download,
  },
  {
    id: "hallTicket",
    label: "Hall Ticket",
    path: "/admin/hall-ticket",
    icon: GraduationCap,
  },
  {
    id: "examManagement",
    label: "Exam Management",
    path: "/admin/exam-approval",
    icon: ClipboardList,
  },
  {
    id: "reports",
    label: "Reports",
    path: "/admin/reports",
    icon: BarChart3,
  },
];
/* ---------------- ROLE BASED GETTER ---------------- */

export const getMenuByRole = (
  roleName: string,
  dates: AcademicDate[] = [],
  hasUsn = false,
  examRegistration = false,
  degreeName?: string
): MenuItem[] => {
  switch (roleName.toLowerCase()) {
    case "student":
      return getStudentMenu(dates, hasUsn, examRegistration, degreeName);
    case "admin":
      return collegeAdminMenu;
    case "document-admin":
      return documentAdminMenu;
    case "sysadmin":
      return systemAdminMenu;
    default:
      return [];
  }
};