import { BrowserRouter } from "react-router-dom";
import AppRoutes from "../src/routes/AppRoutes";
import { AuthProvider } from "../src/context/AuthContext";

export default function App() {

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}