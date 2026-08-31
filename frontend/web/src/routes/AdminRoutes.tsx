import { Routes, Route } from "react-router-dom";
import NotFoundPage from "../features/general/404";
import AdminDashboard from "../features/general/admin_dashboard";
import DocumentVerificationPage from "../features/admin/document-verification";
import FeeCollectionPage from "../features/admin/fee-collection";
import AdmissionFeeMasterPage from "../features/admin/admission-fee-master";
import AdmitStudentsPage from "../features/admin/admit-students";
import UniversityManagementPage from "../features/admin/university-management";
import AuditsPage from "../features/admin/audits";
import ReportsPage from "../features/admin/reports";
import SupportPage from "../features/admin/support-admin";
import Playground from "../features/playground";
import ReceiptPage from "../features/admin/reciept-entry";
import AdminFeeReceiptPage from "../features/admin/admin_fee_reciept";
import ExamApprovalPage from "../features/admin/exam-approval";
import HallTicket from "../features/admin/hall_ticket";
import ExamFeeMaster from "../features/admin/exam_fee_master";
import ApplicationFeeMaster from "../features/admin/application_fee_master";
import DocumentCoordinator from "../features/admin/document_coordinator";
import ProtectedRoute from "./ProtectedRoute";

export default function AdminRoutes() {
  return (
    <Routes>
      {/* Accessible to every admin-type role: admin, document-admin, sysadmin */}
      <Route element={<ProtectedRoute allowedRoles={["admin", "document-admin", "sysadmin"]} />}>
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/document-verification" element={<DocumentVerificationPage/>}/>
        <Route path="/exam-approval" element={<ExamApprovalPage/>}/>
        <Route path="/fee-receipt" element={<AdminFeeReceiptPage/>}/>
      </Route>

      {/* admin + sysadmin only — not document-admin */}
      <Route element={<ProtectedRoute allowedRoles={["admin", "sysadmin"]} />}>
        <Route path="/fee-collection" element={<FeeCollectionPage/>}/>
        <Route path="/admission-fee-master" element={<AdmissionFeeMasterPage/>}/>
        <Route path="/admit-students" element={<AdmitStudentsPage/>}/>
        <Route path="/reports" element={<ReportsPage/>}/>
        <Route path="/receipt" element={<ReceiptPage/>}/>
        <Route path="/exam-fee" element={<ExamFeeMaster/>}/>
        <Route path="/hall-ticket" element={<HallTicket/>}/>
        <Route path="/application-fee" element={<ApplicationFeeMaster/>}/>
        <Route path="/coordinator-allocation" element={<DocumentCoordinator/>}/>
      </Route>

      {/* sysadmin only */}
      <Route element={<ProtectedRoute allowedRoles={["sysadmin"]} />}>
        <Route path="/university-management" element={<UniversityManagementPage/>}/>
        <Route path="/audits" element={<AuditsPage/>}/>
        <Route path="/support" element={<SupportPage/>}/>
        <Route path="/playground" element={<Playground/>}/>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}