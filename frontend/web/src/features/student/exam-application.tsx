import { useState, useEffect, useMemo } from "react";
import { CheckCircle, XCircle, BookOpen, ChevronRight, ChevronLeft } from "lucide-react";
import AppLayout from "../../components/layouts/AppLayout";
import Button from "../../components/ui/Button";
import Toast from "../../components/ui/Toast";
import { getRegistrationByUsername } from "../../services/registrationService";
import { getDegrees, type Degree } from "../../services/degreeService";
import { getCourses, type Course } from "../../services/courseService";
import { getAcademicYears, type AcademicYear } from "../../services/academicYearService";
import { getLookupsByType, type LookupResponse } from "../../services/lookupService";
import { getCourseSubjects, type CourseSubject } from "../../services/courseSubjectService";
import { getSubjects, type Subject } from "../../services/subjectService";
import {
  createExamApplication,
  getExamApplications,
  type ExamApplication,
} from "../../services/examApplicationService";

/* ─── Types ─────────────────────────────────── */

type Step1Form = {
  name: string;
  regisNumber: string;
  mobile: string;
  email: string;
  degreeId: string;
  courseId: string;
  academicYearId: string;
  semId: string;
};

/* ─── Helpers ────────────────────────────────── */

function ApprovalBadge({ label, approved }: { label: string; approved: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
      approved
        ? "bg-green-50 border-green-200 text-green-700"
        : "bg-gray-50 border-gray-200 text-gray-500"
    }`}>
      {approved
        ? <CheckCircle size={13} className="text-green-500" />
        : <XCircle size={13} className="text-gray-400" />}
      {label}
    </div>
  );
}

const SELECT_CLS =
  "w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:bg-gray-50";

/* ─── Component ─────────────────────────────── */

export default function ExamApplicationPage() {
  const username = localStorage.getItem("username") ?? "";

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Step control ── */
  const [step, setStep] = useState<1 | 2>(1);

  /* ── Reference data ── */
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<LookupResponse[]>([]);
  const [allCourseSubjects, setAllCourseSubjects] = useState<CourseSubject[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  /* ── Existing application ── */
  const [existingApp, setExistingApp] = useState<ExamApplication | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);

  /* ── Degree type from registration — used to scope the Degree dropdown
     below, same pattern as degree_course.tsx ── */
  const [regDegreeTypeId, setRegDegreeTypeId] = useState<string>("");

  /* ── Step 1 form ── */
  const [form, setForm] = useState<Step1Form>({
    name: "", regisNumber: "", mobile: "", email: "",
    degreeId: "", courseId: "", academicYearId: "", semId: "",
  });

  /* ── Step 2: selected subjects ── */
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [declarationYN, setDeclarationYN] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ── Load all reference data on mount ── */
  useEffect(() => {
    Promise.all([
      getRegistrationByUsername(username).catch(() => null),
      getDegrees(),
      getCourses(),
      getAcademicYears(),
      getLookupsByType("Semester"),
      getCourseSubjects(),
      getSubjects(),
      getExamApplications(),
    ]).then(([reg, degs, crs, years, sems, cSubjects, subs, apps]) => {
      if (reg) {
        setForm((f) => ({
          ...f,
          name: reg.name ?? "",
          regisNumber: reg.usnNo ?? "",
          mobile: reg.mobile ?? "",
          email: reg.email ?? "",
        }));
        setRegDegreeTypeId(reg.degreeTypeId ?? "");

        const found = (apps as ExamApplication[]).find(
          (a) =>
            a.regisNumber === reg.usnNo ||
            a.name?.toLowerCase() === (reg.name ?? "").toLowerCase()
        );
        if (found) setExistingApp(found);
      }

      setDegrees(degs);
      setCourses(crs);
      setAcademicYears(years);
      setSemesters(sems);
      setAllCourseSubjects(cSubjects);
      setSubjects(subs);
    }).catch(() => {
      showToast("Failed to load page data", "error");
    }).finally(() => setLoadingInit(false));
  }, [username]);

  /* ── Degrees scoped to the degree type selected at registration —
     same pattern as degree_course.tsx: filter by regDegreeTypeId, and
     fall back to the unfiltered list if nothing matches (e.g. reg has
     no degreeTypeId, or it doesn't match any degree on file) ── */
  const visibleDegrees = useMemo(() => {
    if (!regDegreeTypeId) return degrees;
    const filtered = degrees.filter(
      (d) => (d as unknown as { degreeTypeId?: string }).degreeTypeId === regDegreeTypeId
    );
    return filtered.length ? filtered : degrees;
  }, [degrees, regDegreeTypeId]);

  /* ── Courses filtered by selected degree ── */
  const filteredCourses = useMemo(
    () => courses.filter((c) => !form.degreeId || c.degreeId === form.degreeId),
    [courses, form.degreeId]
  );

  /* ── Subjects for step 2 (degree + course + sem) ── */
  const stepSubjects = useMemo(() => {
    if (!form.degreeId || !form.courseId || !form.semId) return [];
    return allCourseSubjects
      .filter(
        (cs) =>
          cs.degreeId === form.degreeId &&
          cs.courseId === form.courseId &&
          cs.semId === form.semId
      )
      .map((cs) => subjects.find((s) => s.id === cs.subjectId))
      .filter((s): s is Subject => !!s);
  }, [allCourseSubjects, subjects, form.degreeId, form.courseId, form.semId]);

  /* ── Step 1 → validation gate ── */
  const handleNext = () => {
    if (!form.name.trim() || !form.regisNumber.trim()) {
      showToast("Name and registration number are required", "error");
      return;
    }
    if (!form.degreeId || !form.courseId || !form.academicYearId || !form.semId) {
      showToast("Please fill all selection fields", "error");
      return;
    }
    if (stepSubjects.length === 0) {
      showToast("No subjects found for this degree / course / semester combination", "error");
      return;
    }
    setSelectedSubjectIds(stepSubjects.map((s) => s.id));
    setStep(2);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (selectedSubjectIds.length === 0) {
      showToast("Select at least one subject", "error");
      return;
    }
    if (!declarationYN) {
      showToast("Please accept the declaration to proceed", "error");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createExamApplication({
        name: form.name,
        regisNumber: form.regisNumber,
        degreeId: form.degreeId,
        courseId: form.courseId,
        semId: form.semId,
        academicYearId: form.academicYearId,
        semesterNumber: semesters.find((s) => s.id === form.semId)?.extraInt1 ?? 0,
        mobile: form.mobile || undefined,
        email: form.email || undefined,
        subjectIds: selectedSubjectIds,
        declarationYn: declarationYN,
      });
      showToast(result.message || "Exam application submitted successfully", "success");
      const apps = await getExamApplications();
      const found = (apps as ExamApplication[]).find((a) => a.id === result.id);
      if (found) setExistingApp(found);
    } catch {
      showToast("Failed to submit exam application", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const setField = (key: keyof Step1Form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  /* ─────────────────── RENDER ─────────────────── */

  if (loadingInit) {
    return (
      <AppLayout pageTitle="Exam Application">
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  /* ── Existing application status view ── */
  if (existingApp) {
    const semName = semesters.find((s) => s.id === existingApp.semId)?.name ?? existingApp.semId;
    const yearMatch = academicYears.find((y) => y.id === existingApp.academicYearId);
    const yearDesc = yearMatch?.description ?? existingApp.academicYearId;
    const yearBatchLabel = yearMatch?.batchYear ?? null;
    const degreeName = degrees.find((d) => d.id === existingApp.degreeId)?.degreeName ?? "";
    const courseName = courses.find((c) => c.id === existingApp.courseId)?.name ?? "";

    return (
      <AppLayout pageTitle="Exam Application">
        {toast && (
          <div className="fixed z-50 -translate-x-1/2 top-6 left-1/2">
            <Toast message={toast.message} type={toast.type} />
          </div>
        )}
        <div className="max-w-2xl pb-8 mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-text">Exam Application</h1>
            <p className="mt-1 text-sm text-gray-500">Your application has been submitted</p>
          </div>

          <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-primary/5">
              <div>
                <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">Application No</p>
                <p className="text-lg font-bold text-text">{existingApp.applicationNo}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                existingApp.status
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-gray-100 border-gray-200 text-gray-500"
              }`}>
                {existingApp.status ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 px-6 py-5 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Name</p>
                <p className="text-sm font-medium text-text">{existingApp.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Registration No</p>
                <p className="text-sm font-medium text-text">{existingApp.regisNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Degree</p>
                <p className="text-sm font-medium text-text">{degreeName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Course</p>
                <p className="text-sm font-medium text-text">{courseName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Batch (Choose the year you first joined 1st year)</p>
                <p className="text-sm font-medium text-text">
                  {yearDesc}
                  {yearBatchLabel && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {yearBatchLabel}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Semester</p>
                <p className="text-sm font-medium text-text">{semName}</p>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">Approval Status</p>
              <div className="flex flex-wrap gap-2">
                <ApprovalBadge label="Academic Approval" approved={existingApp.academicApproval} />
                <ApprovalBadge label="Attendance Approval" approved={existingApp.attendanceApproval} />
                <ApprovalBadge label="Fee No-Dues" approved={existingApp.otherApproval} />
              </div>

              {existingApp.academicApproval && existingApp.attendanceApproval && existingApp.otherApproval && (
                <div className="flex items-center gap-2 px-4 py-3 mt-4 border border-green-200 rounded-lg bg-green-50">
                  <CheckCircle size={16} className="text-green-600" />
                  <p className="text-sm font-medium text-green-700">All approvals complete. You are eligible to appear for the exam.</p>
                </div>
              )}

              {!existingApp.attendanceApproval && (
                <p className="mt-3 text-xs text-gray-400">
                  Your application is pending review by the college. You will be notified once approvals are updated.
                </p>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ── Step Wizard ── */
  return (
    <AppLayout pageTitle="Exam Application">
      {toast && (
        <div className="fixed z-50 -translate-x-1/2 top-6 left-1/2">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}

      <div className="max-w-2xl pb-8 mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Exam Application</h1>
          <p className="mt-1 text-sm text-gray-500">Fill in your details and select subjects to apply for the exam</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {([1, 2] as const).map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors ${
                step === n
                  ? "bg-primary border-primary text-white"
                  : step > n
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-white border-gray-300 text-gray-400"
              }`}>
                {step > n ? <CheckCircle size={14} /> : n}
              </div>
              <span className={`text-sm font-medium ${step >= n ? "text-text" : "text-gray-400"}`}>
                {n === 1 ? "Student Info" : "Select Subjects"}
              </span>
              {n < 2 && <ChevronRight size={16} className="ml-1 text-gray-300" />}
            </div>
          ))}
        </div>

        {/* ───── STEP 1 ───── */}
        {step === 1 && (
          <div className="p-6 space-y-5 bg-white border border-gray-200 shadow-sm rounded-xl">
            <h2 className="text-base font-semibold text-text">Student Information</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  className={SELECT_CLS}
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Registration / USN No <span className="text-red-500">*</span>
                </label>
                <input
                  className={SELECT_CLS}
                  placeholder="USN or Registration Number"
                  value={form.regisNumber}
                  onChange={(e) => setField("regisNumber", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Mobile</label>
                <input
                  className={SELECT_CLS}
                  placeholder="Mobile number"
                  value={form.mobile}
                  onChange={(e) => setField("mobile", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
                <input
                  className={SELECT_CLS}
                  placeholder="Email address"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <p className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">Academic Selection</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Degree <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={SELECT_CLS}
                    value={form.degreeId}
                    onChange={(e) => setForm((f) => ({ ...f, degreeId: e.target.value, courseId: "" }))}
                  >
                    <option value="">Select Degree</option>
                    {visibleDegrees.map((d) => (
                      <option key={d.id} value={d.id}>{d.degreeName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Course <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={SELECT_CLS}
                    value={form.courseId}
                    onChange={(e) => setField("courseId", e.target.value)}
                    disabled={!form.degreeId}
                  >
                    <option value="">{form.degreeId ? "Select Course" : "Select a degree first"}</option>
                    {filteredCourses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={SELECT_CLS}
                    value={form.academicYearId}
                    onChange={(e) => setField("academicYearId", e.target.value)}
                  >
                    <option value="">Select Academic Year</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.batchYear
                          ? `${y.description ?? y.id} (${y.batchYear})`
                          : (y.description ?? `${y.startDate} – ${y.endDate}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Semester <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={SELECT_CLS}
                    value={form.semId}
                    onChange={(e) => setField("semId", e.target.value)}
                  >
                    <option value="">Select Semester</option>
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={handleNext}>
                Next: Select Subjects
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* ───── STEP 2 ───── */}
        {step === 2 && (
          <>
            {/* Subjects card */}
            <div className="p-6 space-y-5 bg-white border border-gray-200 shadow-sm rounded-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text">Select Subjects</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Subjects for{" "}
                    <span className="font-medium text-text">
                      {courses.find((c) => c.id === form.courseId)?.name}
                    </span>{" "}
                    — {semesters.find((s) => s.id === form.semId)?.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const allSelected = stepSubjects.every((s) => selectedSubjectIds.includes(s.id));
                    setSelectedSubjectIds(allSelected ? [] : stepSubjects.map((s) => s.id));
                  }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {stepSubjects.every((s) => selectedSubjectIds.includes(s.id)) ? "Deselect All" : "Select All"}
                </button>
              </div>

              {stepSubjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen size={36} className="mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500">No subjects mapped for this selection.</p>
                  <p className="mt-1 text-xs text-gray-400">Contact your administrator to add subjects for this course and semester.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stepSubjects.map((subject) => {
                    const checked = selectedSubjectIds.includes(subject.id);
                    return (
                      <label
                        key={subject.id}
                        className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? "bg-primary/5 border-primary/30"
                            : "bg-gray-50 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSubject(subject.id)}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text">{subject.name}</p>
                          <p className="text-xs text-gray-400">{subject.code}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400">Max: {subject.maxMarks} | Min: {subject.minMarks}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Declaration — full width, outside subjects card */}
            <div className="p-6 space-y-4 border shadow-sm bg-amber-50 border-amber-200 rounded-xl">
              <p className="text-sm font-bold tracking-wide uppercase text-amber-800">
                Declaration by the Candidate
              </p>
              <p className="text-sm italic font-semibold leading-relaxed text-justify text-gray-700">
                I hereby declare that the above information furnished by me is true. I have not suppressed any
                information. M.G.R.D.P.R University can initiate action against me, if I have furnished any wrong
                information and also my admission may be cancelled. I shall hereby undertake to fulfil 75%
                attendance in each subject (paper) to appear for the examination as per UGC and University Norms,
                Admission and Examination Regulations. I also know that there is no provision in the University
                Rules to condone the shortage of attendance. I shall hereby agree to the University Students Dress
                Code and abide by all the rules and regulations of the University.
              </p>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={declarationYN}
                  onChange={(e) => setDeclarationYN(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded accent-primary shrink-0"
                />
                <span className="text-sm font-medium text-gray-700">
                  I have read and agree to the above declaration <span className="text-red-500">*</span>
                </span>
              </label>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft size={16} />
                Back
              </Button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {selectedSubjectIds.length} of {stepSubjects.length} selected
                </span>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={submitting || selectedSubjectIds.length === 0 || !declarationYN}
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}