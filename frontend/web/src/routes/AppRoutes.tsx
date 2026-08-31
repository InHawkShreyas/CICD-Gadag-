import { Routes, Route } from "react-router-dom";
import LandingPage from "../features/general/landing";
import Login from "../features/auth/login";
import Registration from "../features/auth/registration";
import AdminRoutes from "./AdminRoutes";
import StudentRoutes from "./StudentRoutes";
import NotFoundPage from "../features/general/404";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login/>}/>
      <Route path="/registration" element={<Registration/>}/>

      <Route element={<ProtectedRoute allowedRoles={["admin", "document-admin", "sysadmin"]} />}>
        <Route path="/admin/*" element={<AdminRoutes />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
        <Route path="/student/*" element={<StudentRoutes />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}