import { useState, useEffect, useMemo } from "react";
import AppLayout from "../../components/layouts/AppLayout";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import FilterPanel from "../../components/ui/FilterPanel";
import Toast from "../../components/ui/Toast";
import { createTestId } from "../../utils/testId";
import { getDegrees, type Degree } from "../../services/degreeService";
import { getCourses, type Course } from "../../services/courseService";
import {
  getLookupsByType,
  type LookupResponse,
} from "../../services/lookupService";
import { getSubjects, type Subject } from "../../services/subjectService";
import {
  getCourseSubjects,
  type CourseSubject,
} from "../../services/courseSubjectService";
import { getLoginByUsername } from "../../services/loginService";
import {
  getExamApplications,
  getExamApplicationDetails,
  academicApprove,
  finalApprove,
  type ExamApplication,
} from "../../services/examApplicationService";


type UserRole = "Admin1" | "Admin2" | "SysAdmin" | "other";


type SubjectMarkState = {
  subjectId: string;
  subjectName: string;
  iaMarks: string;
  attendancePercentage: string;
};

type AppRow = ExamApplication & {
  degreeName: string;
  courseName: string;
  semName: string;
};

const PAGE = "exam-approval" as const;

export default function ExamApproval() {
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<LookupResponse[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courseSubjects, setCourseSubjects] = useState<CourseSubject[]>([]);
  const [applications, setApplications] = useState<ExamApplication[]>([]);
  const [userRole, setUserRole] = useState<UserRole>("other");


  const [filters, setFilters] = useState<Record<string, string[]>>({
    degree: [],
    course: [],
    semester: [],
    subject: [],
  });


  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ExamApplication | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);


  const [subjectMarks, setSubjectMarks] = useState<SubjectMarkState[]>([]);
  const [savingAcademic, setSavingAcademic] = useState(false);

  const [attendanceApproval, setAttendanceApproval] = useState(false);
  const [otherApproval, setOtherApproval] = useState(false);
  const [savingFinal, setSavingFinal] = useState(false);


  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };


  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";

    Promise.all([
      getDegrees(),
      getCourses(),
      getLookupsByType("Semester"),
      getSubjects(),
      getCourseSubjects(),
      getExamApplications(),
      username ? getLoginByUsername(username) : Promise.resolve(null),
      getLookupsByType("Role"),
    ]).then(([deg, crs, sems, subs, cs, apps, loginData, roles]) => {
      setDegrees(deg);
      setCourses(crs);
      setSemesters(sems);
      setSubjects(subs);
      setCourseSubjects(cs);
      setApplications(apps);

      if (loginData) {
        const role = roles.find((r) => r.id === loginData.roleId);
        const name = (role?.name ?? "").toLowerCase();
        if (name === "admin1") setUserRole("Admin1");
        else if (name === "admin2") setUserRole("Admin2");
        else if (name === "sysadmin") setUserRole("SysAdmin");
        else if (name === "admin") setUserRole("Admin2");
      }
    });
  }, []);


  const degreeNameById = (id: string) =>
    degrees.find((d) => d.id === id)?.degreeName ?? id;

  const courseNameById = (id: string) =>
    courses.find((c) => c.id === id)?.name ?? id;

  const semNameById = (id: string) =>
    semesters.find((s) => s.id === id)?.name ?? id;

  const subjectNameById = (id: string) =>
    subjects.find((s) => s.id === id)?.name ?? id;


  const handleFilterChange = (key: string, values: string[]) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: values };
      if (key === "degree") {
        next.course = prev.course.filter((id) =>
          courses.find(
            (c) =>
              c.id === id &&
              (values.length === 0 || values.includes(c.degreeId)),
          ),
        );
        next.subject = [];
      }
      if (key === "course") next.subject = [];
      if (key === "semester") next.subject = [];
      return next;
    });
  };



  const filterSections = useMemo(() => {
    const selDegrees = filters.degree;
    const selCourses = filters.course;
    const selSemesters = filters.semester;

    const visibleCourses = selDegrees.length
      ? courses.filter((c) => selDegrees.includes(c.degreeId))
      : courses;

    const csScoped = courseSubjects.filter(
      (cs) =>
        (!selDegrees.length || selDegrees.includes(cs.degreeId)) &&
        (!selCourses.length || selCourses.includes(cs.courseId)) &&
        (!selSemesters.length || selSemesters.includes(cs.semId)),
    );
    const visibleSubjectIds = new Set(csScoped.map((cs) => cs.subjectId));
    const visibleSubjects = subjects.filter((s) => visibleSubjectIds.has(s.id));

    return [
      {
        key: "degree",
        title: "Degree",
        options: degrees.map((d) => ({ value: d.id, label: d.degreeName })),
      },
      {
        key: "course",
        title: "Course",
        options: visibleCourses.map((c) => ({ value: c.id, label: c.name })),
      },
      {
        key: "semester",
        title: "Semester",
        options: semesters.map((s) => ({ value: s.id, label: s.name ?? s.id })),
      },
      {
        key: "subject",
        title: "Subject",
        options: visibleSubjects.map((s) => ({ value: s.id, label: s.name })),
      },
    ];
  }, [
    filters.degree,
    filters.course,
    filters.semester,
    degrees,
    courses,
    semesters,
    courseSubjects,
    subjects,
  ]);

  /* ─── Filtered rows ────────────────────────────────────────────── */

  const filteredRows = useMemo<AppRow[]>(() => {
    const { degree, course, semester, subject } = filters;

    let list = applications;

    if (degree.length) list = list.filter((a) => degree.includes(a.degreeId));
    if (course.length) list = list.filter((a) => course.includes(a.courseId));
    if (semester.length) list = list.filter((a) => semester.includes(a.semId));

    if (subject.length) {
      const csForSubjects = courseSubjects.filter((cs) =>
        subject.includes(cs.subjectId),
      );
      list = list.filter((a) =>
        csForSubjects.some(
          (cs) =>
            cs.degreeId === a.degreeId &&
            cs.courseId === a.courseId &&
            cs.semId === a.semId,
        ),
      );
    }

    return list.map((a) => ({
      ...a,
      degreeName: degrees.find((d) => d.id === a.degreeId)?.degreeName ?? a.degreeId,
      courseName: courses.find((c) => c.id === a.courseId)?.name ?? a.courseId,
      semName: semesters.find((s) => s.id === a.semId)?.name ?? a.semId,
    }));
  }, [filters, applications, courseSubjects, degrees, courses, semesters]);

  /* ─── Open modal ───────────────────────────────────────────────── */

  const openModal = async (app: ExamApplication) => {
    setSelectedApp(app);
    setModalOpen(true);
    setLoadingDetails(true);
    setAttendanceApproval(app.attendanceApproval);
    setOtherApproval(app.otherApproval);

    try {
      const d = await getExamApplicationDetails(app.id);
      setSubjectMarks(
        d.map((detail) => ({
          subjectId: detail.subjectId,
          subjectName: subjectNameById(detail.subjectId),
          iaMarks: detail.iaMarks != null ? String(detail.iaMarks) : "",
          attendancePercentage:
            detail.attendancePercentage != null
              ? String(detail.attendancePercentage)
              : "",
        })),
      );
    } finally {
      setLoadingDetails(false);
    }
  };

  /* ─── Academic approve (Admin2) ────────────────────────────────── */

  const handleAcademicApprove = async () => {
    if (!selectedApp) return;


    for (const sm of subjectMarks) {
      const ia = sm.iaMarks !== "" ? parseFloat(sm.iaMarks) : null;
      const att = sm.attendancePercentage !== "" ? parseFloat(sm.attendancePercentage) : null;

      if (ia !== null && ia < 0) {
        showToast(`IA Marks cannot be negative `, "error");
        return;
      }
      if (att !== null && att < 0) {
        showToast(`Attendance % cannot be negative `, "error");
        return;
      }
      if (att !== null && att > 100) {
        showToast(`Attendance % cannot exceed 100`, "error");
        return;
      }
    }

    setSavingAcademic(true);

    try {
      await academicApprove(selectedApp.id, {
        subjectMarks: subjectMarks.map((sm) => ({
          subjectId: sm.subjectId,
          iaMarks: sm.iaMarks !== "" ? parseFloat(sm.iaMarks) : null,
          attendancePercentage:
            sm.attendancePercentage !== ""
              ? parseFloat(sm.attendancePercentage)
              : null,
        })),
      });

      setApplications((prev) =>
        prev.map((a) =>
          a.id === selectedApp.id ? { ...a, academicApproval: true } : a,
        ),
      );
      setSelectedApp((prev) =>
        prev ? { ...prev, academicApproval: true } : prev,
      );
      showToast("Academic approval saved.", "success");
    } catch {
      showToast("Failed to save academic approval.", "error");
    } finally {
      setSavingAcademic(false);
    }
  };

  /* ─── Final approve (Admin1/SysAdmin) ──────────────────────────── */

  const handleFinalApprove = async () => {
    if (!selectedApp) return;
    setSavingFinal(true);
    try {
      await finalApprove(selectedApp.id, { attendanceApproval, otherApproval });

      setApplications((prev) =>
        prev.map((a) =>
          a.id === selectedApp.id
            ? { ...a, attendanceApproval, otherApproval }
            : a,
        ),
      );
      setSelectedApp((prev) =>
        prev ? { ...prev, attendanceApproval, otherApproval } : prev,
      );
      showToast("Approvals saved.", "success");
    } catch {
      showToast("Failed to save approvals.", "error");
    } finally {
      setSavingFinal(false);
    }
  };

  /* ─── Table columns ────────────────────────────────────────────── */

  const columns = [
    {
      header: "Application No",
      accessor: "applicationNo" as keyof AppRow,
    },
    { header: "Student Name", accessor: "name" as keyof AppRow },
    { header: "Reg. Number", accessor: "regisNumber" as keyof AppRow },
    { header: "Degree", accessor: "degreeName" as keyof AppRow },
    { header: "Course", accessor: "courseName" as keyof AppRow },
    { header: "Semester", accessor: "semName" as keyof AppRow },
    {
      header: "Academic",
      accessor: "academicApproval" as keyof AppRow,
      render: (row: AppRow) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.academicApproval
            ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700"
            }`}
        >
          {row.academicApproval ? "Approved" : "Pending"}
        </span>
      ),
    },
    {
      header: "Attendance",
      accessor: "attendanceApproval" as keyof AppRow,
      render: (row: AppRow) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.attendanceApproval
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-500"
            }`}
        >
          {row.attendanceApproval ? "Approved" : "—"}
        </span>
      ),
    },
    {
      header: "Other",
      accessor: "otherApproval" as keyof AppRow,
      render: (row: AppRow) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.otherApproval
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-500"
            }`}
        >
          {row.otherApproval ? "Approved" : "—"}
        </span>
      ),
    },
  ];

  const canEditAcademic =
    userRole === "Admin1" || userRole === "Admin2" || userRole === "SysAdmin";

  const canEditFinal = userRole === "Admin2" || userRole === "SysAdmin";

  /* ─── Modal content ───────────────────────────────────────────── */

  const renderModalContent = () => {
    if (loadingDetails) {
      return (
        <div className="py-10 text-sm text-center text-gray-500">
          Loading details…
        </div>
      );
    }

    if (canEditAcademic) {
      return (
        <div className="space-y-5">
          {/* ── IA marks + attendance ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-800">
                IA Marks &amp; Attendance
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedApp?.academicApproval
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
                  }`}
              >
                {selectedApp?.academicApproval
                  ? "Academic Approved"
                  : "Pending Academic Approval"}
              </span>
            </div>

            {subjectMarks.length === 0 ? (
              <p className="text-sm text-gray-500">No subjects found.</p>
            ) : (
              <div className="space-y-3">
                {subjectMarks.map((sm, idx) => (
                  <div
                    key={sm.subjectId}
                    className="p-3 space-y-2 border border-gray-200 rounded-lg"
                  >
                    <p className="text-sm font-medium text-gray-700">
                      {sm.subjectName}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="IA Marks"
                        type="number"
                        value={sm.iaMarks}
                        testId={createTestId(PAGE, `ia-marks-${idx}`)}
                        onChange={(e) =>
                          setSubjectMarks((prev) =>
                            prev.map((s, i) =>
                              i === idx
                                ? { ...s, iaMarks: e.target.value }
                                : s,
                            ),
                          )
                        }
                      />
                      <Input
                        label="Attendance %"
                        type="number"
                        value={sm.attendancePercentage}
                        testId={createTestId(PAGE, `attendance-${idx}`)}
                        onChange={(e) =>
                          setSubjectMarks((prev) =>
                            prev.map((s, i) =>
                              i === idx
                                ? { ...s, attendancePercentage: e.target.value }
                                : s,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Save Academic Approval (all three roles) ── */}
          <div className="flex justify-end">
            <Button
              onClick={handleAcademicApprove}
              disabled={savingAcademic || subjectMarks.length === 0}
              testId={createTestId(PAGE, "btn-academic-approve")}
            >
              {savingAcademic ? "Saving…" : "Save Academic Approval"}
            </Button>
          </div>

          {/* ── Final approvals — Admin2 / SysAdmin only ── */}
          {canEditFinal && (
            <>
              <div className="pt-4 space-y-3 border-t border-gray-200">
                <h3 className="font-medium text-gray-800">Final Approvals</h3>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-blue-600"
                    checked={attendanceApproval}
                    data-testid={createTestId(PAGE, "chk-attendance-approval")}
                    onChange={(e) => setAttendanceApproval(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">
                    Attendance Approval
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-blue-600"
                    checked={otherApproval}
                    data-testid={createTestId(PAGE, "chk-other-approval")}
                    onChange={(e) => setOtherApproval(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">
                    Other Approval (No Dues)
                  </span>
                </label>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleFinalApprove}
                  disabled={savingFinal}
                  testId={createTestId(PAGE, "btn-final-approve")}
                >
                  {savingFinal ? "Saving…" : "Save Approvals"}
                </Button>
              </div>
            </>
          )}
        </div>
      );
    }
  };

  /* ─── JSX ─────────────────────────────────────────────────────── */

  return (
    <AppLayout pageTitle="Exam Approval">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Approval</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and approve student exam applications.
          </p>
        </div>

        <div className="flex justify-end">
          <FilterPanel
            sections={filterSections}
            values={filters}
            onChange={handleFilterChange}
          />
        </div>

        <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
          <Table
            columns={columns}
            data={filteredRows}
            onView={(row) => openModal(row)}
          />
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          selectedApp
            ? `${selectedApp.name} — ${selectedApp.applicationNo}`
            : "Application Details"
        }
        size="lg"
      >
        {selectedApp && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 text-sm rounded-lg sm:grid-cols-3 bg-gray-50">
              <div>
                <p className="text-gray-500">Reg. No</p>
                <p className="font-medium text-gray-800">
                  {selectedApp.regisNumber}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Degree</p>
                <p className="font-medium text-gray-800">
                  {degreeNameById(selectedApp.degreeId)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Course</p>
                <p className="font-medium text-gray-800">
                  {courseNameById(selectedApp.courseId)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Semester</p>
                <p className="font-medium text-gray-800">
                  {semNameById(selectedApp.semId)}
                </p>
              </div>
              {selectedApp.mobile && (
                <div>
                  <p className="text-gray-500">Mobile</p>
                  <p className="font-medium text-gray-800">
                    {selectedApp.mobile}
                  </p>
                </div>
              )}
              {selectedApp.email && (
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium text-gray-800">
                    {selectedApp.email}
                  </p>
                </div>
              )}
            </div>

            {renderModalContent()}
          </div>
        )}
      </Modal>

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999]">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </AppLayout>
  );
}
