import StudentDashboard from "../features/student/dashboard";
import ApplicationPage from "../features/student/application";
import DocumentsPage from "../features/student/documents";
import PhotoUploadPage from "../features/student/photo";
import ManualFeeReceiptPage from "../features/student/receipts";
import FeePaymentPage from "../features/student/fees/application_fee";
import AdmissionFeePage from "../features/student/fees/admission-fee";
import AdmitCardPage from "../features/student/fees/admit-card";
import SupportPage from "../features/student/support-student";
import FeeResponsePage from "../features/student/fees/fee-response";
import FeeReceiptPage from "../features/student/fees/fee_reciept";
import ExamApplication from "../features/student/exam-application";
import ExamFeePaymentPage from "../features/student/fees/exam-fee";
import { Routes, Route } from "react-router-dom";
import NotFoundPage from "../features/general/404";


export default function StudentRoutes() {
  return (
    <Routes>
      <Route path="/" element={<StudentDashboard />} />
      <Route path="/application" element={<ApplicationPage />} />
      <Route path="/documents" element={<DocumentsPage />} />
      <Route path="/photos" element={<PhotoUploadPage />} />
      <Route path="/application-fee" element={<FeePaymentPage />} />
      <Route path="/admission-fee" element={<AdmissionFeePage />} />
      <Route path="/admit-card" element={<AdmitCardPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/fee-response" element={<FeeResponsePage />} />
      <Route path="/fee-receipt" element={<FeeReceiptPage />} />
      <Route path="/exam-application" element={<ExamApplication />} />
      <Route path="/exam-fee-payment" element={<ExamFeePaymentPage />} />
      <Route path="/manual-fee-receipt" element={<ManualFeeReceiptPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
