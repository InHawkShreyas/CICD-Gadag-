import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { getMenuByRole, type MenuItem } from "./layoutConfig";
import { getLoginByUsername } from "../../services/loginService";
import { getLookupsByType } from "../../services/lookupService";
import { getRegistrationByUsername } from "../../services/registrationService";
import { getMyFullApplication } from "../../services/applicationQueryService";
import { getCourseDetailsByApplicationId } from "../../services/applicationCourseDetailService";
import { getDegreeById } from "../../services/degreeService";

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export default function AppLayout({
  children,
  pageTitle = "Dashboard",
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [displayRole, setDisplayRole] = useState("");

  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";

    if (!username) return;

    setDisplayName(username);

    Promise.all([
      getLoginByUsername(username),
      getLookupsByType("Role"),
      getRegistrationByUsername(username).catch(() => null),
    ]).then(async ([loginData, roles, reg]) => {
      const role = roles.find((r) => r.id === loginData.roleId);
      const roleName = role?.name ?? "";
      const hasUsn = !!reg?.usnNo;
      const examRegistration = !!reg?.examRegistration;
      setDisplayRole(roleName);

      let degreeName: string | undefined;
      if (roleName.toLowerCase() === "student" && hasUsn) {
        try {
          const result = await getMyFullApplication();
          const app = result?.application;
          if (app) {
            const courseDetails = await getCourseDetailsByApplicationId(app.id);
            if (courseDetails.length) {
              const degree = await getDegreeById(courseDetails[0].degreeId);
              degreeName = degree.degreeName;
            }
          }
        } catch {
        }
      }

      const isExemptDegree =
        degreeName?.trim().toLowerCase() === "bachelor of science" &&
        reg?.academicYearDescription?.trim() === "2023-2024";

      setMenuItems(getMenuByRole(roleName, [], hasUsn, examRegistration, isExemptDegree ? degreeName : undefined));
    }).catch(() => {
      setMenuItems(getMenuByRole("student"));
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* SIDEBAR - DESKTOP */}
      <div className="hidden md:block">
        <Sidebar
          menuItems={menuItems}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={setSidebarCollapsed}
        />
      </div>

      {/* SIDEBAR - MOBILE */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <Sidebar menuItems={menuItems} />
        </div>
      )}

      {/* HEADER */}
      <Header
        title={pageTitle}
        userName={displayName}
        userRole={displayRole}
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* MAIN CONTENT */}
      <main
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "md:ml-20" : "md:ml-64"
        } mt-16 min-h-[calc(100vh-64px)]`}
      >
        <div className="p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}