import { useState, useMemo, useEffect, useCallback, type ChangeEvent, type ReactNode } from "react";
import { createTestId } from "../../utils/testId";
import {
  Plus,
  Upload,
  X,
  FileText,
  Building2,
  Bell,
  GraduationCap,
  BookOpen,
  Library,
  CalendarRange,
  CalendarClock,
  KeyRound,
  ListTree,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Toast from "../../components/ui/Toast";
import AppLayout from "../../components/layouts/AppLayout";
import {
  getUniversities,
  createUniversity,
  updateUniversity,
  deleteUniversity,
  type University,
} from "../../services/universityService";
import {
  getDegrees,
  createDegree,
  updateDegree,
  deleteDegree,
  type Degree,
} from "../../services/degreeService";
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  type Course as ApiCourse,
} from "../../services/courseService";
import {
  getNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  downloadNotificationFile,
  type Notification as ApiNotification,
} from "../../services/notificationService";
import {
  getAcademicDates,
  createAcademicDate,
  updateAcademicDate,
  deleteAcademicDate,
  type AcademicDate,
} from "../../services/academicDateService";
import {
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  type AcademicYear,
} from "../../services/academicYearService";
import {
  getLookups,
  getLookupsByType,
  createLookup,
  updateLookup,
  deleteLookup,
  type LookupResponse,
  type CreateLookupRequest,
} from "../../services/lookupService";
import {
  getLoginByUsername,
  updateRole,
} from "../../services/loginService";
import { uploadStudents } from "../../services/studentService";
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  type Subject,
} from "../../services/subjectService";
import {
  getCourseSubjects,
  createCourseSubject,
  updateCourseSubject,
  deleteCourseSubject,
  type CourseSubject,
} from "../../services/courseSubjectService";



type CourseForm = {
  degreeId: string;
  name: string;
  code: string;
  totalSeats: number;
};

type FoundLogin = {
  username: string;
  roleId: string;
  ipAddress: string | null;
};

type NotificationForm = {
  title: string;
  description: string;
  date: string;
  file?: File;
};

const PAGE = "university-management" as const;

const ACADEMIC_DATE_OPTIONS = [
  { label: "Admission Window", value: "ADMISSION_WINDOW" },
  { label: "Extend Admission Window", value: "EXTEND_ADMISSION_WINDOW" },
  { label: "Edit Window", value: "EDIT_WINDOW" },
  { label: "Admission Fee Payment Window", value: "FEE_PAYMENT_WINDOW" },
  { label: "Joining Window", value: "JOINING_WINDOW" },
];

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

type TabKey =
  | "university"
  | "notification"
  | "degree"
  | "course"
  | "subject"
  | "academic-year"
  | "dates"
  | "logins"
  | "lookup"
  | "old-students";

const TAB_DEFS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: "university", label: "University", icon: <Building2 size={16} /> },
  { key: "notification", label: "Notification", icon: <Bell size={16} /> },
  { key: "degree", label: "Degree", icon: <GraduationCap size={16} /> },
  { key: "course", label: "Course", icon: <BookOpen size={16} /> },
  { key: "subject", label: "Subject", icon: <Library size={16} /> },
  { key: "academic-year", label: "Academic Year", icon: <CalendarRange size={16} /> },
  { key: "dates", label: "Set Dates", icon: <CalendarClock size={16} /> },
  { key: "logins", label: "Logins", icon: <KeyRound size={16} /> },
  { key: "lookup", label: "Lookup", icon: <ListTree size={16} /> },
  { key: "old-students", label: "Old Students", icon: <FileSpreadsheet size={16} /> },
];

/** Subtle pill-style icon-button row actions, rendered as a custom Actions column per table. */
function RowActions({
  onView,
  onEdit,
  onDelete,
  testIdBase,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  testIdBase: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onView && (
        <button
          type="button"
          onClick={onView}
          title="View"
          aria-label="View"
          data-testid={createTestId(PAGE, `${testIdBase}-view`)}
          className="p-2 text-blue-500 transition-colors duration-150 rounded-full hover:bg-blue-50 hover:text-blue-600"
        >
          <Eye size={20} strokeWidth={2} />
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          aria-label="Edit"
          data-testid={createTestId(PAGE, `${testIdBase}-edit`)}
          className="p-2 text-yellow-500 transition-colors duration-150 rounded-full hover:bg-yellow-50 hover:text-yellow-600"
        >
          <Pencil size={20} strokeWidth={2} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          aria-label="Delete"
          data-testid={createTestId(PAGE, `${testIdBase}-delete`)}
          className="p-2 text-red-500 transition-colors duration-150 rounded-full hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={20} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

/** Consistent header used at the top of every tab panel: icon, title, description and the primary action. */
function TabSectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary shrink-0">
          {icon}
        </span>
        <div>
          <h2 className="text-base font-semibold text-text sm:text-lg">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export default function UniversityManagementPage() {

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);


  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showConfirm = useCallback((message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm });
  }, []);

  const [activeTab, setActiveTab] = useState<TabKey>("university");


  const [universities, setUniversities] = useState<University[]>([]);
  const [universityModalOpen, setUniversityModalOpen] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [universityForm, setUniversityForm] = useState<{ name: string; address: string; phoneNo: string; email: string }>({
    name: "", address: "", phoneNo: "", email: "",
  });


  const [dateViewOnly, setDateViewOnly] = useState(false);


  useEffect(() => {
    let active = true;
    getUniversities()
      .then((data) => { if (active) setUniversities(data); })
      .catch(() => { if (active) showToast("Failed to load universities", "error"); });
    return () => { active = false; };
  }, []);

  const openUniversityModal = (university?: University) => {
    if (university) {
      setSelectedUniversity(university);
      setUniversityForm({
        name: university.name,
        address: university.address ?? "",
        phoneNo: university.phoneNo ?? "",
        email: university.email ?? "",
      });
    } else {
      setSelectedUniversity(null);
      setUniversityForm({ name: "", address: "", phoneNo: "", email: "" });
    }
    setUniversityModalOpen(true);
  };

  const saveUniversity = async () => {
    if (!universityForm.name.trim()) {
      showToast("University name is required", "error");
      return;
    }
    if (!universityForm.address.trim()) {
      showToast("Address is required", "error");
      return;
    }
    if (!universityForm.email.trim()) {
      showToast("Email is required", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(universityForm.email.trim())) {
      showToast("Enter a valid email address", "error");
      return;
    }
    if (!universityForm.phoneNo.trim()) {
      showToast("Phone number is required", "error");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(universityForm.phoneNo.trim())) {
      showToast("Enter a valid 10-digit mobile number", "error");
      return;
    }
    const nameDuplicate = universities.find((u) => {
      if (selectedUniversity && u.id === selectedUniversity.id) return false;
      return u.name.trim().toLowerCase() === universityForm.name.trim().toLowerCase();
    });


    if (nameDuplicate) {
      const emailMatch =
        (nameDuplicate.email ?? "").trim().toLowerCase() ===
        universityForm.email.trim().toLowerCase();
      const phoneMatch = nameDuplicate.phoneNo?.trim() === universityForm.phoneNo.trim();

      if (emailMatch || phoneMatch) {
        if (emailMatch)
          showToast("A university with this name and email already exists", "error");
        else
          showToast("A university with this name and phone number already exists", "error");
        return;
      }

    }


    const contactDuplicate = universities.find((u) => {
      if (selectedUniversity && u.id === selectedUniversity.id) return false;
      return (
        (u.email ?? "").trim().toLowerCase() === universityForm.email.trim().toLowerCase() ||
        u.phoneNo?.trim() === universityForm.phoneNo.trim()
      );
    });

    if (contactDuplicate) {
      if (
        (contactDuplicate.email ?? "").trim().toLowerCase() ===
        universityForm.email.trim().toLowerCase()
      )
        showToast("A university with this email already exists", "error");
      else
        showToast("A university with this phone number already exists", "error");
      return;
    }
    try {
      if (selectedUniversity) {
        await updateUniversity({ id: selectedUniversity.id, ...universityForm });
        setUniversities((prev) =>
          prev.map((u) => (u.id === selectedUniversity.id ? { ...u, ...universityForm } : u))
        );
        showToast("University updated successfully", "success");
      } else {
        const created = await createUniversity({ ...universityForm });
        setUniversities((prev) => [...prev, created]);
        showToast("University created successfully", "success");
      }
      setUniversityModalOpen(false);
    } catch {
      showToast("Failed to save university", "error");
    }
  };

  const handleDeleteUniversity = (university: University) => {
    showConfirm(`Delete "${university.name}"?`, async () => {
      try {
        await deleteUniversity(university.id);
        setUniversities((prev) => prev.filter((u) => u.id !== university.id));
        showToast("University deleted", "success");
      } catch {
        showToast("Failed to delete university", "error");
      }
    });
  };


  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<ApiNotification | null>(null);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [notificationForm, setNotificationForm] = useState<NotificationForm>({
    title: "",
    description: "",
    date: "",
  });

  useEffect(() => {
    getNotifications()
      .then(setNotifications)
      .catch(() => showToast("Failed to load notifications", "error"));
  }, []);


  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [selectedDegree, setSelectedDegree] = useState<Degree | null>(null);
  const [degreeModalOpen, setDegreeModalOpen] = useState(false);
  const [degreeForm, setDegreeForm] = useState<{ universityId: string; degreeName: string; duration: string; description: string; degreeTypeId: string }>({
    universityId: "",
    degreeName: "",
    duration: "",
    description: "",
    degreeTypeId: "",
  });
  const [degreeTypeOptions, setDegreeTypeOptions] = useState<LookupResponse[]>([]);
  const [degreeSearch, setDegreeSearch] = useState("");

  useEffect(() => {
    getDegrees()
      .then(setDegrees)
      .catch(() => showToast("Failed to load degrees", "error"));
  }, []);

  useEffect(() => {
    getLookupsByType("DegreeType")
      .then(setDegreeTypeOptions)
      .catch(() => showToast("Failed to load degree types", "error"));
  }, []);

  const filteredDegrees = useMemo(() => {
    return degrees.filter((d) => {
      const degreeTypeName =
        degreeTypeOptions.find((t) => t.id === (d as unknown as { degreeTypeId?: string }).degreeTypeId)?.name ?? "";
      return (
        degreeSearch === "" ||
        d.degreeName.toLowerCase().includes(degreeSearch.toLowerCase()) ||
        degreeTypeName.toLowerCase().includes(degreeSearch.toLowerCase())
      );
    });
  }, [degrees, degreeSearch, degreeTypeOptions]);


  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<ApiCourse | null>(null);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [courseForm, setCourseForm] = useState<CourseForm>({
    degreeId: "",
    name: "",
    code: "",
    totalSeats: 0,
  });
  // Degree Type is used only to filter the Degree dropdown in the Add/Edit
  // Course modal — it is not part of CourseForm and is never saved.
  const [courseDegreeTypeFilter, setCourseDegreeTypeFilter] = useState("");

  // Degrees available for the selected degree type in the course modal
  const degreeOptionsForCourse = useMemo(() => {
    if (!courseDegreeTypeFilter) return degrees;
    return degrees.filter(
      (d) => (d as unknown as { degreeTypeId?: string }).degreeTypeId === courseDegreeTypeFilter
    );
  }, [degrees, courseDegreeTypeFilter]);

  // When the degree-type filter changes, drop a selected degree that no
  // longer belongs to the filtered set.
  useEffect(() => {
    setCourseForm((prev) => {
      if (!prev.degreeId) return prev;
      if (degreeOptionsForCourse.some((d) => d.id === prev.degreeId)) return prev;
      return { ...prev, degreeId: "" };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseDegreeTypeFilter]);


  useEffect(() => {
    getCourses()
      .then(setCourses)
      .catch(() => showToast("Failed to load courses", "error"));
  }, []);


  const [dates, setDates] = useState<AcademicDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<AcademicDate | null>(null);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [dateForm, setDateForm] = useState<Omit<AcademicDate, "id">>({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
    status: true,
  });

  useEffect(() => {
    getAcademicDates()
      .then(setDates)
      .catch(() => showToast("Failed to load academic dates", "error"));
  }, []);


  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<AcademicYear | null>(null);
  const [academicYearModalOpen, setAcademicYearModalOpen] = useState(false);
  const [academicYearForm, setAcademicYearForm] = useState<Omit<AcademicYear, "id"> & { batchYear: string }>({
    description: "",
    startDate: "",
    endDate: "",
    batchYear: "",
  });

  useEffect(() => {
    getAcademicYears()
      .then(setAcademicYears)
      .catch(() => showToast("Failed to load academic years", "error"));
  }, []);

  const openAcademicYearModal = (year?: AcademicYear) => {
    if (year) {
      setSelectedAcademicYear(year);
      setAcademicYearForm({
        description: year.description ?? "",
        startDate: year.startDate ? year.startDate.slice(0, 10) : "",
        endDate: year.endDate ? year.endDate.slice(0, 10) : "",
        // NOTE: `batchYear` isn't on the AcademicYear type yet — add it to the
        // AcademicYear model/service once the backend column exists.
        batchYear: (year as AcademicYear & { batchYear?: string }).batchYear ?? "",
      });
    } else {
      setSelectedAcademicYear(null);
      setAcademicYearForm({ description: "", startDate: "", endDate: "", batchYear: "" });
    }
    setAcademicYearModalOpen(true);
  };

  const saveAcademicYear = async () => {
    const { startDate, endDate, description, batchYear } = academicYearForm;

    if (!batchYear?.trim()) {
      showToast("Batch year is required", "error");
      return;
    }


    if (!startDate || !endDate) {
      showToast("Start date and end date are required", "error");
      return;
    }


    const start = new Date(startDate);
    const end = new Date(endDate);
    const minDate = new Date("2000-01-01");

    if (start.getFullYear() > 9999 || end.getFullYear() > 9999) {
      showToast("Please enter a valid date", "error");
      return;
    }

    if (start < minDate || end < minDate) {
      showToast("Dates must be on or after 01-01-2000", "error");
      return;
    }

    if (end <= start) {
      showToast("End date must be after start date", "error");
      return;
    }


    if (!description?.trim()) {
      showToast("Description is required", "error");
      return;
    }


    const descDuplicate = academicYears.find((y) => {
      if (selectedAcademicYear && y.id === selectedAcademicYear.id) return false;
      return (
        (y.description ?? "").trim().toLowerCase() ===
        description.trim().toLowerCase()
      );
    });
    if (descDuplicate) {
      showToast("An academic year with this description already exists", "error");
      return;
    }


    const rangeDuplicate = academicYears.find((y) => {
      if (selectedAcademicYear && y.id === selectedAcademicYear.id) return false;
      return y.startDate === startDate && y.endDate === endDate;
    });
    if (rangeDuplicate) {
      showToast("An academic year with this date range already exists", "error");
      return;
    }

    try {
      const formToSave = {
        ...academicYearForm,
        description: description.trim(),
        batchYear: batchYear.trim(),
      };

      if (selectedAcademicYear) {
        await updateAcademicYear({ id: selectedAcademicYear.id, ...formToSave });
        setAcademicYears((prev) =>
          prev.map((y) =>
            y.id === selectedAcademicYear.id ? { ...y, ...formToSave } : y
          )
        );
        showToast("Academic year updated successfully", "success");
      } else {
        const created = await createAcademicYear(formToSave);
        setAcademicYears((prev) => [...prev, created]);
        showToast("Academic year created successfully", "success");
      }
      setAcademicYearModalOpen(false);
    } catch {
      showToast("Failed to save academic year", "error");
    }
  };

  const handleDeleteAcademicYear = (year: AcademicYear) => {
    showConfirm("Delete this academic year?", async () => {
      try {
        await deleteAcademicYear(year.id);
        setAcademicYears((prev) => prev.filter((y) => y.id !== year.id));
        showToast("Academic year deleted", "success");
      } catch {
        showToast("Failed to delete academic year", "error");
      }
    });
  };


  const [lookups, setLookups] = useState<LookupResponse[]>([]);
  const [selectedLookup, setSelectedLookup] = useState<LookupResponse | null>(null);
  const [lookupSearch, setLookupSearch] = useState("");
  const [lookupForm, setLookupForm] = useState<CreateLookupRequest>({
    code: "", name: "", description: "", type: "",
  });
  const [lookupModalOpen, setLookupModalOpen] = useState(false);

  useEffect(() => {
    getLookups()
      .then(setLookups)
      .catch(() => showToast("Failed to load lookups", "error"));
  }, []);

  const openLookupModal = (lookup?: LookupResponse) => {
    if (lookup) {
      setSelectedLookup(lookup);
      setLookupForm({
        code: lookup.code ?? "",
        name: lookup.name ?? "",
        description: lookup.extraDescription ?? "",
        type: lookup.type ?? "",
        startDate: lookup.startDate ?? "",
        endDate: lookup.endDate ?? "",
      });
    } else {
      setSelectedLookup(null);
      setLookupForm({ code: "", name: "", description: "", type: "", startDate: "", endDate: "" });
    }
    setLookupModalOpen(true);
  };

  const saveLookup = async () => {
    if (!lookupForm.code || !lookupForm.name) {
      showToast("Code and Name are required", "error");
      return;
    }
    // Backend expects DateOnly? — empty strings fail to deserialize, so send null instead.
    const payload = {
      ...lookupForm,
      startDate: lookupForm.startDate ? lookupForm.startDate : null,
      endDate: lookupForm.endDate ? lookupForm.endDate : null,
    };
    try {
      if (selectedLookup) {
        await updateLookup(selectedLookup.id, payload);
        setLookups((prev) => prev.map((l) => l.id === selectedLookup.id ? { ...l, ...payload } : l));
        showToast("Lookup updated successfully", "success");
      } else {
        const created = await createLookup(payload);
        setLookups((prev) => [...prev, created]);
        showToast("Lookup created successfully", "success");
      }
      setLookupModalOpen(false);
    } catch {
      showToast("Failed to save lookup", "error");
    }
  };

  const handleDeleteLookup = (lookup: LookupResponse) => {
    showConfirm(`Delete "${lookup.name}"?`, async () => {
      try {
        await deleteLookup(lookup.id);
        setLookups((prev) => prev.filter((l) => l.id !== lookup.id));
        showToast("Lookup deleted", "success");
      } catch {
        showToast("Failed to delete lookup", "error");
      }
    });
  };

  const filteredLookups = useMemo(() => {
    return lookups.filter(
      (l) =>
        lookupSearch === "" ||
        (l.name ?? "").toLowerCase().includes(lookupSearch.toLowerCase()) ||
        (l.code ?? "").toLowerCase().includes(lookupSearch.toLowerCase()) ||
        (l.type ?? "").toLowerCase().includes(lookupSearch.toLowerCase())
    );
  }, [lookups, lookupSearch]);


  const [loginSearchQuery, setLoginSearchQuery] = useState("");
  const [loginSearching, setLoginSearching] = useState(false);
  const [foundLogin, setFoundLogin] = useState<FoundLogin | null>(null);
  const [roleOptions, setRoleOptions] = useState<LookupResponse[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    getLookupsByType("Role")
      .then(setRoleOptions)
      .catch(() => { });
  }, []);

  const handleLoginSearch = async () => {
    const q = loginSearchQuery.trim();
    if (!q) { showToast("Enter a username to search", "error"); return; }
    setLoginSearching(true);
    setFoundLogin(null);
    setSelectedRoleId("");
    try {
      const result = await getLoginByUsername(q);
      setFoundLogin(result);
      setSelectedRoleId(result.roleId ?? "");
    } catch {
      showToast("User not found", "error");
    } finally {
      setLoginSearching(false);
    }
  };

  const handleSaveRole = async () => {
    if (!foundLogin || !selectedRoleId) { showToast("Select a role", "error"); return; }
    setSavingRole(true);
    try {
      await updateRole({ username: foundLogin.username, roleId: selectedRoleId });
      setFoundLogin({ ...foundLogin, roleId: selectedRoleId });
      showToast("Role updated successfully", "success");
    } catch {
      showToast("Failed to update role", "error");
    } finally {
      setSavingRole(false);
    }
  };


  const handleNotificationFormChange = (field: keyof NotificationForm, value: string) => {
    setNotificationForm((prev) => ({ ...prev, [field]: value }));
  };


  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setNotificationForm((prev) => ({ ...prev, file }));
    } else {
      showToast("Please select a PDF file only", "error");
    }
  };


  const openNotificationModal = (notification?: ApiNotification) => {
    if (notification) {
      setSelectedNotification(notification);
      setNotificationForm({
        title: notification.title,
        description: notification.description ?? "",
        date: notification.date ? notification.date.split("T")[0] : "",

      });
    } else {
      setSelectedNotification(null);
      setNotificationForm({ title: "", description: "", date: "" });
    }
    setNotificationModalOpen(true);
  };

  const saveNotification = async () => {
    if (!notificationForm.title.trim()) {
      showToast("Title is required", "error");
      return;
    }
    if (!notificationForm.description.trim()) {
      showToast("Description is required", "error");
      return;
    }
    if (!notificationForm.date) {
      showToast("Date is required", "error");
      return;
    }
    if (!selectedNotification && !notificationForm.file) {
      showToast("Attachment is required", "error");
      return;
    }

    const duplicate = notifications.find((n) => {
      if (selectedNotification && n.id === selectedNotification.id) return false;
      return n.title.trim().toLowerCase() === notificationForm.title.trim().toLowerCase();
    });
    if (duplicate) {
      showToast("A notification with this title already exists", "error");
      return;
    }

    if (notificationForm.file && notificationForm.file.size > 20 * 1024 * 1024) {
      showToast("File size must not exceed 20 MB", "error");
      return;
    }
    const notifDate = new Date(notificationForm.date);
    const minDate = new Date("2000-01-01");

    if (isNaN(notifDate.getTime()) || notifDate.getFullYear() > 9999) {
      showToast("Please enter a valid date", "error");
      return;
    }

    if (notifDate < minDate) {
      showToast("Date must be on or after 01-01-2000", "error");
      return;
    }

    try {
      if (selectedNotification) {
        await updateNotification({
          id: selectedNotification.id,
          title: notificationForm.title.trim(),
          description: notificationForm.description,
          date: notificationForm.date,
          file: notificationForm.file,
        });
        const refreshed = await getNotifications();
        setNotifications(refreshed);
        showToast("Notification updated successfully", "success");
      } else {
        await createNotification({
          title: notificationForm.title.trim(),
          description: notificationForm.description,
          date: notificationForm.date,
          file: notificationForm.file,
        });
        const refreshed = await getNotifications();
        setNotifications(refreshed);
        showToast("Notification created successfully", "success");
      }
      setNotificationModalOpen(false);
    } catch {
      showToast("Failed to save notification", "error");
    }
  };
  const handleDeleteNotification = (notification: ApiNotification) => {
    showConfirm(`Delete "${notification.title}"?`, async () => {
      try {
        await deleteNotification(notification.id);
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        showToast("Notification deleted", "success");
      } catch {
        showToast("Failed to delete notification", "error");
      }
    });
  };


  const openDegreeModal = (degree?: Degree) => {
    if (degree) {
      setSelectedDegree(degree);
      setDegreeForm({
        universityId: degree.universityId,
        degreeName: degree.degreeName,
        duration: degree.duration ?? "",
        description: degree.description ?? "",
        degreeTypeId: (degree as unknown as { degreeTypeId?: string }).degreeTypeId ?? "",
      });
    } else {
      setSelectedDegree(null);
      setDegreeForm({ universityId: "", degreeName: "", duration: "", description: "", degreeTypeId: "" });
    }
    setDegreeModalOpen(true);
  };

  const saveDegree = async () => {
    if (!degreeForm.universityId) {
      showToast("Please select a university", "error");
      return;
    }
    if (!degreeForm.degreeName.trim()) {
      showToast("Degree name is required", "error");
      return;
    }
    if (!degreeForm.degreeTypeId) {
      showToast("Please select a degree type", "error");
      return;
    }
    if (/[^a-zA-Z._\- ]/.test(degreeForm.degreeName.trim())) {
      showToast(
        "Degree name can only contain letters, spaces, hyphens (-), dots (.) and underscores (_)",
        "error"
      );
      return;
    }

    const durationTrimmed = degreeForm.duration.trim();

    if (durationTrimmed) {

      if (/[^a-zA-Z0-9 ]/.test(durationTrimmed)) {
        showToast("Duration must not contain special characters", "error");
        return;
      }

      if (!/^\d/.test(durationTrimmed)) {
        showToast("Duration must start with a number (e.g. 4 Years)", "error");
        return;
      }


      const durationNum = parseFloat(durationTrimmed);
      if (isNaN(durationNum) || durationNum <= 0) {
        showToast("Duration must be greater than 0", "error");
        return;
      }
    }

    if (degreeForm.description && !degreeForm.description.trim()) {
      showToast("Description cannot be blank spaces only", "error");
      return;
    }

    const duplicate = degrees.find((d) => {
      if (selectedDegree && d.id === selectedDegree.id) return false;
      return (
        d.universityId === degreeForm.universityId &&
        d.degreeName.trim().toLowerCase() === degreeForm.degreeName.trim().toLowerCase()
      );
    });
    if (duplicate) {
      showToast("This degree already exists under the selected university", "error");
      return;
    }

    try {
      const formToSave = {
        ...degreeForm,
        degreeName: degreeForm.degreeName.trim(),
        duration: durationTrimmed,
        description: degreeForm.description.trim(),
      };

      if (selectedDegree) {
        await updateDegree({ id: selectedDegree.id, ...formToSave });
        setDegrees((prev) =>
          prev.map((d) => (d.id === selectedDegree.id ? { ...d, ...formToSave } : d))
        );
        showToast("Degree updated successfully", "success");
      } else {
        const created = await createDegree(formToSave);
        setDegrees((prev) => [...prev, created]);
        showToast("Degree created successfully", "success");
      }
      setDegreeModalOpen(false);
    } catch {
      showToast("Failed to save degree", "error");
    }
  };

  const handleDeleteDegree = (degree: Degree) => {
    showConfirm(`Delete "${degree.degreeName}"?`, async () => {
      try {
        await deleteDegree(degree.id);
        setDegrees((prev) => prev.filter((d) => d.id !== degree.id));
        showToast("Degree deleted", "success");
      } catch {
        showToast("Failed to delete degree", "error");
      }
    });
  };


  const openCourseModal = (course?: ApiCourse) => {
    if (course) {
      setSelectedCourse(course);
      setCourseForm({
        degreeId: course.degreeId,
        name: course.name,
        code: course.code ?? "",
        totalSeats: course.totalSeats,
      });
      const courseDegree = degrees.find((d) => d.id === course.degreeId);
      setCourseDegreeTypeFilter(
        (courseDegree as unknown as { degreeTypeId?: string })?.degreeTypeId ?? ""
      );
    } else {
      setSelectedCourse(null);
      setCourseForm({ degreeId: "", name: "", code: "", totalSeats: 0 });
      setCourseDegreeTypeFilter("");
    }
    setCourseModalOpen(true);
  };

  const saveCourse = async () => {
    if (!courseForm.degreeId) {
      showToast("Please select a degree", "error");
      return;
    }
    if (!courseForm.name.trim()) {
      showToast("Course name is required", "error");
      return;
    }
    if (/[^a-zA-Z &().,'-]/.test(courseForm.name.trim())) {
      showToast("Course name contains invalid characters", "error");
      return;
    }
    if (!courseForm.code.trim()) {
      showToast("Code is required", "error");
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(courseForm.code.trim())) {
      showToast("Code must contain only letters and numbers", "error");
      return;
    }
    if (!courseForm.totalSeats || courseForm.totalSeats <= 0) {
      showToast("Total seats must be greater than 0", "error");
      return;
    }


    const duplicate = courses.find((c) => {
      if (selectedCourse && c.id === selectedCourse.id) return false;
      return (
        c.degreeId === courseForm.degreeId &&
        c.name.trim().toLowerCase() === courseForm.name.trim().toLowerCase()
      );
    });
    if (duplicate) {
      showToast("This course already exists under the selected degree", "error");
      return;
    }

    try {
      const formToSave = {
        ...courseForm,
        name: courseForm.name.trim(),
        code: courseForm.code.trim().toUpperCase(),
      };
      if (selectedCourse) {
        await updateCourse({ id: selectedCourse.id, ...formToSave });
        setCourses((prev) =>
          prev.map((c) => (c.id === selectedCourse.id ? { ...c, ...formToSave } : c))
        );
        showToast("Course updated successfully", "success");
      } else {
        const created = await createCourse(formToSave);
        setCourses((prev) => [...prev, created]);
        showToast("Course created successfully", "success");
      }
      setCourseModalOpen(false);
    } catch {
      showToast("Failed to save course", "error");
    }
  };

  const handleDeleteCourse = (course: ApiCourse) => {
    showConfirm(`Delete "${course.name}"?`, async () => {
      try {
        await deleteCourse(course.id);
        setCourses((prev) => prev.filter((c) => c.id !== course.id));
        showToast("Course deleted", "success");
      } catch {
        showToast("Failed to delete course", "error");
      }
    });
  };


  const openDateModal = (date?: AcademicDate) => {
    if (date) {
      setSelectedDate(date);
      setDateForm({
        name: date.name ?? "",
        startDate: date.startDate ? date.startDate.slice(0, 10) : "",  // ← slice
        endDate: date.endDate ? date.endDate.slice(0, 10) : "",
        description: date.description ?? "",
        status: date.status,
      });
    } else {
      setSelectedDate(null);
      setDateForm({ name: "", startDate: "", endDate: "", description: "", status: true });
    }
    setDateModalOpen(true);
  };

  const saveDate = async () => {
    if (!dateForm.name || !dateForm.startDate || !dateForm.endDate) {
      showToast("Please fill required fields", "error");
      return;
    }


    const start = new Date(dateForm.startDate);
    const end = new Date(dateForm.endDate);
    const minDate = new Date("2000-01-01");

    if (start < minDate || end < minDate) {
      showToast("Dates must be on or after 01-01-2000", "error");
      return;
    }

    if (end <= start) {
      showToast("End date must be after start date", "error");
      return;
    }

    try {
      if (selectedDate) {
        await updateAcademicDate({ id: selectedDate.id, ...dateForm });
        setDates((prev) => prev.map((d) => d.id === selectedDate.id ? { ...d, ...dateForm } : d));
        showToast("Date updated successfully", "success");
      } else {
        const created = await createAcademicDate(dateForm);
        setDates((prev) => [...prev, created]);
        showToast("Date created successfully", "success");
      }
      setDateModalOpen(false);
    } catch {
      showToast("Failed to save date", "error");
    }
  };

  const handleDeleteDate = (date: AcademicDate) => {
    showConfirm(`Delete "${date.name}"?`, async () => {
      try {
        await deleteAcademicDate(date.id);
        setDates((prev) => prev.filter((d) => d.id !== date.id));
        showToast("Date deleted", "success");
      } catch {
        showToast("Failed to delete date", "error");
      }
    });
  };


  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState<{ name: string; code: string; maxMarks: number; minMarks: number }>({
    name: "", code: "", maxMarks: 0, minMarks: 0,
  });

  useEffect(() => {
    getSubjects()
      .then(setSubjects)
      .catch(() => showToast("Failed to load subjects", "error"));
  }, []);

  const openSubjectModal = (subject?: Subject) => {
    if (subject) {
      setSelectedSubject(subject);
      setSubjectForm({ name: subject.name, code: subject.code, maxMarks: subject.maxMarks, minMarks: subject.minMarks });
    } else {
      setSelectedSubject(null);
      setSubjectForm({ name: "", code: "", maxMarks: 0, minMarks: 0 });
    }
    setSubjectModalOpen(true);
  };

  const saveSubject = async () => {
    if (!subjectForm.name.trim()) {
      showToast("Subject name is required", "error");
      return;
    }
    if (!subjectForm.code.trim()) {
      showToast("Code is required", "error");
      return;
    }
    if (!subjectForm.maxMarks || subjectForm.maxMarks <= 0) {
      showToast("Max marks is required and must be greater than 0", "error");
      return;
    }
    if (!subjectForm.minMarks || subjectForm.minMarks <= 0) {
      showToast("Min marks is required and must be greater than 0", "error");
      return;
    }
    if (subjectForm.minMarks >= subjectForm.maxMarks) {
      showToast("Min marks must be less than max marks", "error");
      return;
    }

    try {
      if (selectedSubject) {
        await updateSubject({ id: selectedSubject.id, ...subjectForm });
        setSubjects((prev) =>
          prev.map((s) => (s.id === selectedSubject.id ? { ...s, ...subjectForm } : s))
        );
        showToast("Subject updated successfully", "success");
      } else {
        const created = await createSubject(subjectForm);
        setSubjects((prev) => [...prev, created]);
        showToast("Subject created successfully", "success");
      }
      setSubjectModalOpen(false);
    } catch {
      showToast("Failed to save subject", "error");
    }
  };
  const handleDeleteSubject = (subject: Subject) => {
    showConfirm(`Delete "${subject.name}"?`, async () => {
      try {
        await deleteSubject(subject.id);
        setSubjects((prev) => prev.filter((s) => s.id !== subject.id));
        showToast("Subject deleted successfully", "success");
      } catch {
        showToast("Failed to delete subject", "error");
      }
    });
  };


  const [courseSubjects, setCourseSubjects] = useState<CourseSubject[]>([]);
  const [selectedCourseSubject, setSelectedCourseSubject] = useState<CourseSubject | null>(null);
  const [courseSubjectModalOpen, setCourseSubjectModalOpen] = useState(false);
  const [courseSubjectForm, setCourseSubjectForm] = useState<{ degreeId: string; courseId: string; semId: string; subjectId: string }>({
    degreeId: "", courseId: "", semId: "", subjectId: "",
  });
  const [semesterOptions, setSemesterOptions] = useState<LookupResponse[]>([]);

  useEffect(() => {
    getCourseSubjects()
      .then(setCourseSubjects)
      .catch(() => showToast("Failed to load course subjects", "error"));
    getLookupsByType("Semester")
      .then(setSemesterOptions)
      .catch(() => { });
  }, []);

  const filteredCourseSubjectCourses = courses.filter(
    (c) => !courseSubjectForm.degreeId || c.degreeId === courseSubjectForm.degreeId
  );

  const openCourseSubjectModal = (cs?: CourseSubject) => {
    if (cs) {
      setSelectedCourseSubject(cs);
      setCourseSubjectForm({ degreeId: cs.degreeId, courseId: cs.courseId, semId: cs.semId, subjectId: cs.subjectId });
    } else {
      setSelectedCourseSubject(null);
      setCourseSubjectForm({ degreeId: "", courseId: "", semId: "", subjectId: "" });
    }
    setCourseSubjectModalOpen(true);
  };

  const saveCourseSubject = async () => {
    if (!courseSubjectForm.degreeId || !courseSubjectForm.courseId || !courseSubjectForm.semId || !courseSubjectForm.subjectId) {
      showToast("All fields are required", "error");
      return;
    }
    try {
      if (selectedCourseSubject) {
        await updateCourseSubject({ id: selectedCourseSubject.id, ...courseSubjectForm });
        setCourseSubjects((prev) => prev.map((cs) => cs.id === selectedCourseSubject.id ? { ...cs, ...courseSubjectForm } : cs));
        showToast("Course subject updated successfully", "success");
      } else {
        const created = await createCourseSubject(courseSubjectForm);
        setCourseSubjects((prev) => [...prev, created]);
        showToast("Course subject created successfully", "success");
      }
      setCourseSubjectModalOpen(false);
    } catch {
      showToast("Failed to save course subject", "error");
    }
  };

  const handleDeleteCourseSubject = (cs: CourseSubject) => {
    showConfirm("Delete this course subject mapping?", async () => {
      try {
        await deleteCourseSubject(cs.id);
        setCourseSubjects((prev) => prev.filter((s) => s.id !== cs.id));
        showToast("Course subject deleted", "success");
      } catch {
        showToast("Failed to delete course subject", "error");
      }
    });
  };

  // Old Students Registration Tab
  const [oldStudentsFile, setOldStudentsFile] = useState<File | null>(null);
  const [oldStudentsDegreeId, setOldStudentsDegreeId] = useState("");
  const [oldStudentsCourseId, setOldStudentsCourseId] = useState("");
  const [oldStudentsAcademicYearId, setOldStudentsAcademicYearId] = useState("");
  const [oldStudentsSaving, setOldStudentsSaving] = useState(false);

  const filteredOldStudentsCourses = courses.filter(
    (c) => !oldStudentsDegreeId || c.degreeId === oldStudentsDegreeId
  );

  const handleOldStudentsSave = async () => {
    if (!oldStudentsFile) { showToast("Please select an Excel file", "error"); return; }
    if (!oldStudentsDegreeId) { showToast("Please select a degree", "error"); return; }
    if (!oldStudentsCourseId) { showToast("Please select a course", "error"); return; }
    if (!oldStudentsAcademicYearId) { showToast("Please select an academic year", "error"); return; }

    setOldStudentsSaving(true);
    try {
      const result = await uploadStudents({
        file: oldStudentsFile,
        degreeId: oldStudentsDegreeId,
        courseId: oldStudentsCourseId,
        academicYearId: oldStudentsAcademicYearId,
      });
      showToast(result.message || "Old students imported successfully", "success");
      setOldStudentsFile(null);
      setOldStudentsDegreeId("");
      setOldStudentsCourseId("");
      setOldStudentsAcademicYearId("");
    } catch {
      showToast("Failed to import students", "error");
    } finally {
      setOldStudentsSaving(false);
    }
  };

  /* ─────────────────────────── TAB RENDERERS ─────────────────────────── */

  const renderUniversityTab = () => {
    const universityColumns = [
      { header: "Name", accessor: "name" as const },
      { header: "Address", accessor: "address" as const },
      { header: "Phone", accessor: "phoneNo" as const },
      { header: "Email", accessor: "email" as const },
      {
        header: "Actions",
        accessor: "id" as const,
        render: (row: University) => (
          <RowActions
            onEdit={() => openUniversityModal(row)}
            onDelete={() => handleDeleteUniversity(row)}
            testIdBase={`university-${row.id}`}
          />
        ),
      },
    ];

    return (
      <div className="space-y-6">
        <TabSectionHeader
          icon={<Building2 size={20} />}
          title="Universities"
          description="Manage the universities available across the platform."
          action={
            <Button variant="primary" onClick={() => openUniversityModal()} testId={createTestId("university-management", "add-university-btn")}>
              <Plus size={18} />
              Add University
            </Button>
          }
        />

        <div className="pb-2 overflow-x-auto bg-white border shadow-sm rounded-2xl border-slate-200">
          <Table
            columns={universityColumns}
            data={universities}
          />
        </div>

        <Modal
          open={universityModalOpen}
          title={selectedUniversity ? "Edit University" : "Add University"}
          onClose={() => setUniversityModalOpen(false)}
        >
          <div className="space-y-4">
            <Input
              label="University Name"
              placeholder="e.g., Gadag University"
              value={universityForm.name}
              inputMode="alpha"
              onChange={(e) => setUniversityForm({ ...universityForm, name: e.target.value })}
              testId={createTestId("university-management", "university-name-input")}
              required
            />
            <Input
              label="Address"
              placeholder="e.g., 123 University Road, Gadag"
              value={universityForm.address}
              inputMode="alphanumeric"
              onChange={(e) => setUniversityForm({ ...universityForm, address: e.target.value })}
              testId={createTestId("university-management", "university-address-input")}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Phone"
                placeholder="e.g., 8462223456"
                inputMode="numeric"
                value={universityForm.phoneNo}
                onChange={(e) => setUniversityForm({ ...universityForm, phoneNo: e.target.value })}
                testId={createTestId("university-management", "university-phone-input")}
                required
              />
              <Input
                label="Email"
                placeholder="e.g., info@university.edu.in"
                value={universityForm.email}
                onChange={(e) => setUniversityForm({ ...universityForm, email: e.target.value })}
                testId={createTestId("university-management", "university-email-input")}
                required
              />
            </div>
            <div className="flex flex-col-reverse justify-end gap-3 pt-5 border-t sm:flex-row border-slate-100">
              <Button variant="outline" onClick={() => setUniversityModalOpen(false)} testId={createTestId("university-management", "university-cancel-btn")}>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveUniversity} testId={createTestId("university-management", "university-save-btn")}>
                {selectedUniversity ? "Save Changes" : "Create University"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  };

  const renderNotificationTab = () => {
    const notificationColumns = [
      { header: "Title", accessor: "title" as const },
      { header: "Description", accessor: "description" as const },
      { header: "Date", accessor: "date" as const, render: (row: ApiNotification) => formatDate(row.date) },
      {
        header: "Attachment",
        accessor: "fileName" as const,
        render: (row: ApiNotification) => (
          <div className="flex items-center gap-2">
            {row.fileName ? (
              <Button
                testId={createTestId(PAGE, `btn-download-notification-${row.id}`)}
                variant="outline"
                onClick={() => downloadNotificationFile(row.id)}
                className="p-0 text-xs bg-transparent border-0 shadow-none text-primary hover:underline"
              >
                <FileText size={16} />
                {row.fileName}
              </Button>
            ) : (
              <span className="text-xs text-gray-400">No file</span>
            )}
          </div>
        ),
      },
      {
        header: "Actions",
        accessor: "id" as const,
        render: (row: ApiNotification) => (
          <RowActions
            onEdit={() => openNotificationModal(row)}
            onDelete={() => handleDeleteNotification(row)}
            testIdBase={`notification-${row.id}`}
          />
        ),
      },
    ];

    return (
      <div className="space-y-6">
        <TabSectionHeader
          icon={<Bell size={20} />}
          title="Notifications"
          description="Publish announcements and circulars for applicants."
          action={
            <Button variant="primary" onClick={() => openNotificationModal()} testId={createTestId("university-management", "add-notification-btn")}>
              <Plus size={18} />
              Add Notification
            </Button>
          }
        />
        <div className="pb-2 overflow-x-auto bg-white border shadow-sm rounded-2xl border-slate-200">
          <Table
            columns={notificationColumns}
            data={notifications}
          />
        </div>

        <Modal
          open={notificationModalOpen}
          title={selectedNotification ? "Edit Notification" : "Add Notification"}
          onClose={() => setNotificationModalOpen(false)}
          size="lg"
        >
          <div className="space-y-4">
            <Input
              label="Title"
              placeholder="Notification title"
              inputMode="alpha"
              value={notificationForm.title}
              onChange={(e) => handleNotificationFormChange("title", e.target.value)}
              testId={createTestId("university-management", "notification-title-input")}
              required
            />
            <Input
              label="Description"
              inputMode="alphanumeric"
              placeholder="Notification description"
              value={notificationForm.description}
              onChange={(e) => handleNotificationFormChange("description", e.target.value)}
              testId={createTestId("university-management", "notification-description-input")}
              required
            />
            <Input
              label="Date"
              type="date"
              value={notificationForm.date}
              onChange={(e) => handleNotificationFormChange("date", e.target.value)}
              testId={createTestId("university-management", "notification-date-input")}
              required
            />

            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Attachment (PDF only)
                <span className="text-red-600">*</span>
              </label>
              {selectedNotification?.fileName && !notificationForm.file && (
                <div className="flex items-center gap-2 px-3 py-2 mb-2 border bg-slate-50 rounded-xl border-slate-200">
                  <FileText size={16} className="text-primary shrink-0" />
                  <span className="flex-1 text-sm text-gray-700 truncate">{selectedNotification.fileName}</span>
                  <Button
                    testId={createTestId(PAGE, "btn-download-notification")}
                    variant="outline"
                    onClick={() => downloadNotificationFile(selectedNotification.id)}
                    className="p-0 text-xs bg-transparent border-0 shadow-none text-primary hover:underline shrink-0"
                  >
                    Download
                  </Button>
                </div>
              )}
              <div className="relative p-6 text-center transition border-2 border-dashed border-slate-300 rounded-2xl hover:border-primary hover:bg-primary/5">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Upload PDF file"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload size={24} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {notificationForm.file
                        ? notificationForm.file.name
                        : selectedNotification?.fileName
                          ? "Click to replace file"
                          : "Click to upload PDF"}
                    </p>
                    <p className="text-xs text-gray-500">PDF files only</p>
                  </div>
                </div>
              </div>
              {notificationForm.file && (
                <Button
                  testId={createTestId(PAGE, "btn-remove-file")}
                  variant="outline"
                  onClick={() =>
                    setNotificationForm({
                      ...notificationForm,
                      file: undefined,
                    })
                  }
                  className="p-0 mt-2 text-sm text-red-500 bg-transparent border-0 shadow-none hover:text-red-700"
                >
                  <X size={16} />
                  Remove file
                </Button>
              )}
            </div>

            <div className="flex flex-col-reverse justify-end gap-3 pt-5 border-t sm:flex-row border-slate-100">
              <Button variant="outline" onClick={() => setNotificationModalOpen(false)} testId={createTestId("university-management", "notification-cancel-btn")}>
                Close
              </Button>
              <Button variant="primary" onClick={saveNotification} testId={createTestId("university-management", "notification-save-btn")}>
                Save Notification
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  };

  const renderLookupTab = () => {
    const columns = [
      { header: "Code", accessor: "code" as const },
      { header: "Name", accessor: "name" as const },
      { header: "Type", accessor: "type" as const },
      { header: "Start Date", accessor: "startDate" as const, render: (row: LookupResponse) => formatDate(row.startDate) },
      { header: "End Date", accessor: "endDate" as const, render: (row: LookupResponse) => formatDate(row.endDate) },
      {
        header: "Actions",
        accessor: "id" as const,
        render: (row: LookupResponse) => (
          <RowActions
            onEdit={() => openLookupModal(row)}
            onDelete={() => handleDeleteLookup(row)}
            testIdBase={`lookup-${row.id}`}
          />
        ),
      },
    ];

    return (
      <div className="space-y-6">
        <TabSectionHeader
          icon={<ListTree size={20} />}
          title="Lookups"
          description="Manage reference data such as categories and roles."
          action={
            <Button variant="primary" onClick={() => openLookupModal()} testId={createTestId("university-management", "add-lookup-btn")}>
              <Plus size={18} />
              Add Lookup
            </Button>
          }
        />

        <div className="w-full sm:max-w-sm">
          <Input
            variant="search"
            placeholder="Search by name, code, or type..."
            value={lookupSearch}
            onChange={(e) => setLookupSearch(e.target.value)}
            onClear={() => setLookupSearch("")}
            testId={createTestId("university-management", "lookup-search-input")}
          />
        </div>

        <div className="pb-2 overflow-x-auto bg-white border shadow-sm rounded-2xl border-slate-200">
          <Table
            columns={columns}
            data={filteredLookups}
          />
        </div>

        <Modal
          open={lookupModalOpen}
          title={selectedLookup ? "Edit Lookup" : "Add Lookup"}
          onClose={() => setLookupModalOpen(false)}
        >
          <div className="space-y-4">
            <Input
              label="Code"
              placeholder="e.g., CASTE_GEN"
              value={lookupForm.code ?? ""}
              onChange={(e) => setLookupForm({ ...lookupForm, code: e.target.value })}
              testId={createTestId("university-management", "lookup-code-input")}
              required
            />
            <Input
              label="Name"
              placeholder="e.g., General"
              value={lookupForm.name ?? ""}
              onChange={(e) => setLookupForm({ ...lookupForm, name: e.target.value })}
              testId={createTestId("university-management", "lookup-name-input")}
              required
            />
            <Input
              label="Type"
              placeholder="e.g., CASTE"
              value={lookupForm.type ?? ""}
              onChange={(e) => setLookupForm({ ...lookupForm, type: e.target.value })}
              testId={createTestId("university-management", "lookup-type-input")}
              required
            />
            <Input
              label="Start Date (Optional)"
              type="date"
              min="2000-01-01"
              value={lookupForm.startDate ?? ""}
              onChange={(e) => setLookupForm({ ...lookupForm, startDate: e.target.value })}
              testId={createTestId("university-management", "lookup-start-date-input")}
            />
            <Input
              label="End Date (Optional)"
              type="date"
              min={lookupForm.startDate || "2000-01-01"}
              value={lookupForm.endDate ?? ""}
              onChange={(e) => setLookupForm({ ...lookupForm, endDate: e.target.value })}
              testId={createTestId("university-management", "lookup-end-date-input")}
            />
            <Input
              label="Description"
              placeholder="Optional description"
              value={lookupForm.description ?? ""}
              onChange={(e) => setLookupForm({ ...lookupForm, description: e.target.value })}
              testId={createTestId("university-management", "lookup-description-input")}
              required
            />
            <div className="flex flex-col-reverse justify-end gap-3 pt-5 border-t sm:flex-row border-slate-100">
              <Button variant="outline" onClick={() => setLookupModalOpen(false)} testId={createTestId("university-management", "lookup-cancel-btn")}>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveLookup} testId={createTestId("university-management", "lookup-save-btn")}>
                {selectedLookup ? "Save Changes" : "Create Lookup"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  };

  const renderDegreeTab = () => {
    const degreeColumns = [
      {
        header: "University",
        accessor: "universityId" as const,
        render: (row: Degree) =>
          universities.find((u) => u.id === row.universityId)?.name ?? row.universityId,
      },
      { header: "Degree Name", accessor: "degreeName" as const },
      {
        header: "Degree Type",
        accessor: "id" as const,
        render: (row: Degree) =>
          degreeTypeOptions.find((t) => t.id === (row as unknown as { degreeTypeId?: string }).degreeTypeId)?.name ?? "—",
      },
      { header: "Duration", accessor: "duration" as const },
      { header: "Description", accessor: "description" as const },
      {
        header: "Actions",
        accessor: "id" as const,
        render: (row: Degree) => (
          <RowActions
            onEdit={() => openDegreeModal(row)}
            onDelete={() => handleDeleteDegree(row)}
            testIdBase={`degree-${row.id}`}
          />
        ),
      },
    ];

    return (
      <div className="space-y-6">
        <TabSectionHeader
          icon={<GraduationCap size={20} />}
          title="Degrees"
          description="Manage degree programmes offered under each university."
          action={
            <Button variant="primary" onClick={() => openDegreeModal()} testId={createTestId("university-management", "add-degree-btn")}>
              <Plus size={18} />
              Add Degree
            </Button>
          }
        />
        <div className="w-full sm:max-w-sm">
          <Input
            variant="search"
            placeholder="Search by degree name or type..."
            value={degreeSearch}
            onChange={(e) => setDegreeSearch(e.target.value)}
            onClear={() => setDegreeSearch("")}
            testId={createTestId("university-management", "degree-search-input")}
          />
        </div>
        <div className="pb-2 overflow-x-auto bg-white border shadow-sm rounded-2xl border-slate-200">
          <Table
            columns={degreeColumns}
            data={filteredDegrees}
          />
        </div>

        <Modal
          open={degreeModalOpen}
          title={selectedDegree ? "Edit Degree" : "Add Degree"}
          onClose={() => setDegreeModalOpen(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                University <span className="text-red-500">*</span>
              </label>
              <select
                data-testid={createTestId("university-management", "degree-university-select")}
                value={degreeForm.universityId}
                onChange={(e) => setDegreeForm({ ...degreeForm, universityId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              >
                <option value="">Select University</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Degree Type <span className="text-red-500">*</span>
              </label>
              <select
                data-testid={createTestId("university-management", "degree-type-select")}
                value={degreeForm.degreeTypeId}
                onChange={(e) => setDegreeForm({ ...degreeForm, degreeTypeId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              >
                <option value="">Select Degree Type</option>
                {degreeTypeOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Degree Name"
                placeholder="e.g., Bachelor of Engineering"
                value={degreeForm.degreeName}
                onChange={(e) =>
                  setDegreeForm({
                    ...degreeForm,
                    degreeName: e.target.value,
                  })
                }
                inputMode="text"
                required
              />
              <Input
                label="Duration"
                placeholder="e.g., 4 Years"
                value={degreeForm.duration}
                onChange={(e) =>
                  setDegreeForm({
                    ...degreeForm,
                    duration: e.target.value,
                  })
                }
                inputMode="alphanumeric"
                testId={createTestId("university-management", "degree-duration-input")}
                required
              />
            </div>
            <Input
              label="Description"
              placeholder="Brief description of the degree"
              value={degreeForm.description}
              onChange={(e) => setDegreeForm({ ...degreeForm, description: e.target.value })}
              testId={createTestId("university-management", "degree-description-input")}
              required
            />
            <div className="flex flex-col-reverse justify-end gap-3 pt-5 border-t sm:flex-row border-slate-100">
              <Button variant="outline" onClick={() => setDegreeModalOpen(false)} testId={createTestId("university-management", "degree-cancel-btn")}>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveDegree} testId={createTestId("university-management", "degree-save-btn")}>
                {selectedDegree ? "Save Changes" : "Create Degree"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  };

  const renderCourseTab = () => {
    const courseColumns = [
      { header: "Name", accessor: "name" as const },
      { header: "Code", accessor: "code" as const },
      {
        header: "Degree",
        accessor: "degreeId" as const,
        render: (row: ApiCourse) =>
          degrees.find((d) => d.id === row.degreeId)?.degreeName ?? row.degreeId,
      },
      { header: "Total Seats", accessor: "totalSeats" as const },
      {
        header: "Actions",
        accessor: "id" as const,
        render: (row: ApiCourse) => (
          <RowActions
            onEdit={() => openCourseModal(row)}
            onDelete={() => handleDeleteCourse(row)}
            testIdBase={`course-${row.id}`}
          />
        ),
      },
    ];

    return (
      <div className="space-y-6">
        <TabSectionHeader
          icon={<BookOpen size={20} />}
          title="Courses"
          description="Manage courses offered under each degree."
          action={
            <Button variant="primary" onClick={() => openCourseModal()} testId={createTestId("university-management", "add-course-btn")}>
              <Plus size={18} />
              Add Course
            </Button>
          }
        />
        <div className="pb-2 overflow-x-auto bg-white border shadow-sm rounded-2xl border-slate-200">
          <Table
            columns={courseColumns}
            data={courses}
          />
        </div>

        <Modal
          open={courseModalOpen}
          title={selectedCourse ? "Edit Course" : "Add Course"}
          onClose={() => setCourseModalOpen(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Degree Type
              </label>
              <select
                data-testid={createTestId("university-management", "course-degree-type-select")}
                value={courseDegreeTypeFilter}
                onChange={(e) => setCourseDegreeTypeFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              >
                <option value="">All Degree Types</option>
                {degreeTypeOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Degree <span className="text-red-500">*</span>
              </label>
              <select
                data-testid={createTestId("university-management", "course-degree-select")}
                value={courseForm.degreeId}
                onChange={(e) => setCourseForm({ ...courseForm, degreeId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              >
                <option value="">Select Degree</option>
                {degreeOptionsForCourse.map((deg) => (
                  <option key={deg.id} value={deg.id}>{deg.degreeName}</option>
                ))}
              </select>
            </div>
            <Input
              label="Course Name"
              placeholder="e.g., Computer Science"
              value={courseForm.name}
              onChange={(e) =>
                setCourseForm({
                  ...courseForm,
                  name: e.target.value,
                })
              }
              inputMode="text"
              testId={createTestId("university-management", "course-name-input")}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Code"
                placeholder="e.g., CSE"
                value={courseForm.code}
                onChange={(e) =>
                  setCourseForm({
                    ...courseForm,
                    code: e.target.value,
                  })
                }
                inputMode="alphanumeric"
                testId={createTestId("university-management", "course-code-input")}
                required
              />
              <Input
                label="Total Seats"
                type="number"
                inputMode="numeric"
                min="1"
                value={courseForm.totalSeats === 0 ? "" : courseForm.totalSeats.toString()}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) {
                    setCourseForm({ ...courseForm, totalSeats: val });
                  } else if (e.target.value === "") {
                    setCourseForm({ ...courseForm, totalSeats: 0 });
                  }
                }}
                testId={createTestId("university-management", "course-total-seats-input")}
                required
              />
            </div>
            <div className="flex flex-col-reverse justify-end gap-3 pt-5 border-t sm:flex-row border-slate-100">
              <Button variant="outline" onClick={() => setCourseModalOpen(false)} testId={createTestId("university-management", "course-cancel-btn")}>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveCourse} testId={createTestId("university-management", "course-save-btn")}>
                {selectedCourse ? "Save Changes" : "Create Course"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  };

  const renderDatesTab = () => {
    const dateColumns = [
      { header: "Name", accessor: "name" as const },
      { header: "Start Date", accessor: "startDate" as const, render: (row: AcademicDate) => formatDate(row.startDate) },
      { header: "End Date", accessor: "endDate" as const, render: (row: AcademicDate) => formatDate(row.endDate) },
      { header: "Description", accessor: "description" as const },
      {
        header: "Actions",
        accessor: "id" as const,
        render: (row: AcademicDate) => (
          <RowActions
            onView={() => { setDateViewOnly(true); openDateModal(row); }}
            onEdit={() => { setDateViewOnly(false); openDateModal(row); }}
            onDelete={() => handleDeleteDate(row)}
            testIdBase={`date-${row.id}`}
          />
        ),
      },
    ];

    return (
      <div className="space-y-6">
        <TabSectionHeader
          icon={<CalendarClock size={20} />}
          title="Important Dates"
          description="Configure admission windows and other key dates."
          action={
            <Button variant="primary" onClick={() => openDateModal()} testId={createTestId("university-management", "add-date-btn")}>
              <Plus size={18} />
              Add Important Date
            </Button>
          }
        />
        <div className="pb-2 overflow-x-auto bg-white border shadow-sm rounded-2xl border-slate-200">
          <Table
            columns={dateColumns}
            data={dates}
          />
        </div>

        <Modal
          open={dateModalOpen}

          title={dateViewOnly ? "View Important Date" : selectedDate ? "Edit Important Date" : "Add Important Date"}
          onClose={() => setDateModalOpen(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Event Type <span className="text-red-500">*</span>
              </label>
              <select
                value={dateForm.name}
                onChange={(e) => setDateForm({ ...dateForm, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                required
                disabled={dateViewOnly}
              >
                <option value="">Select Event</option>
                {ACADEMIC_DATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <Input
              label="Start Date"
              type="date"
              min="2000-01-01"
              value={dateForm.startDate ?? ""}
              onChange={(e) =>
                setDateForm({ ...dateForm, startDate: e.target.value })
              }
              disabled={dateViewOnly}
              required
            />
            <Input
              label="End Date"
              type="date"
              min={dateForm.startDate || "2000-01-01"}
              value={dateForm.endDate ?? ""}
              onChange={(e) =>
                setDateForm({ ...dateForm, endDate: e.target.value })
              }
              disabled={dateViewOnly}
              required
            />

            <Input
              label="Description"
              placeholder="Brief description of the event"
              value={dateForm.description}
              onChange={(e) => setDateForm({ ...dateForm, description: e.target.value })}
              testId={createTestId("university-management", "date-description-input")}
              required
              disabled={dateViewOnly}
            />
            <div className="flex flex-col-reverse justify-end gap-3 pt-5 border-t sm:flex-row border-slate-100">
              <Button variant="outline" onClick={() => setDateModalOpen(false)}>
                {dateViewOnly ? "Close" : "Cancel"}
              </Button>
              {!dateViewOnly && (
                <Button variant="primary" onClick={saveDate}>
                  Save Date
                </Button>
              )}
            </div>
          </div>
        </Modal>
      </div>
    );
  };

  const renderLoginsTab = () => {
    const currentRoleName = roleOptions.find((r) => r.id === foundLogin?.roleId)?.name ?? foundLogin?.roleId ?? "—";

    return (
      <div className="space-y-6">
        <TabSectionHeader
          icon={<KeyRound size={20} />}
          title="Logins"
          description="Look up a user account and update its assigned role."
        />

        <div className="p-5 bg-white border shadow-sm rounded-2xl border-slate-200">
          <label className="block mb-2 text-sm font-semibold text-slate-700">Search User by Username</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Input
                variant="search"
                placeholder="Enter username..."
                value={loginSearchQuery}
                onChange={(e) => { setLoginSearchQuery(e.target.value); setFoundLogin(null); }}
                onClear={() => { setLoginSearchQuery(""); setFoundLogin(null); setSelectedRoleId(""); }}
                testId={createTestId("university-management", "login-search-input")}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleLoginSearch}
              disabled={loginSearching}
              testId={createTestId("university-management", "login-search-btn")}
            >
              {loginSearching ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        {foundLogin && (
          <div className="p-6 space-y-5 bg-white border shadow-sm rounded-2xl border-slate-200">
            <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">User Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-gray-400">Username</p>
                <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium text-text border border-slate-200">
                  {foundLogin.username}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-400">IP Address</p>
                <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium text-text border border-slate-200">
                  {foundLogin.ipAddress ?? "—"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-400">Current Role</p>
                <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium text-text border border-slate-200">
                  {currentRoleName}
                </p>
              </div>
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Assign Role <span className="text-red-500">*</span>
              </label>
              <select
                data-testid={createTestId("university-management", "login-role-select")}
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              >
                <option value="">Select a role...</option>
                {roleOptions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name ?? r.code ?? r.id}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end pt-2 border-t">
              <Button
                variant="primary"
                onClick={handleSaveRole}
                disabled={savingRole || !selectedRoleId}
                testId={createTestId("university-management", "login-save-btn")}
              >
                {savingRole ? "Saving..." : "Save Role"}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOldStudentsTab = () => (
    <div className="space-y-6">
      <TabSectionHeader
        icon={<FileSpreadsheet size={20} />}
        title="Old Students Registration"
        description="Bulk import existing student records from an Excel sheet."
      />

      <div className="max-w-xl p-6 space-y-6 bg-white border shadow-sm rounded-2xl border-slate-200">
        <p className="text-sm text-gray-500">
          Upload an Excel file (.xlsx / .xls) containing old student records. Select the degree, course, and academic year before saving.
        </p>

        <div>
          <label className="block mb-2 text-sm font-semibold text-slate-700">
            Excel File <span className="text-red-500">*</span>
          </label>
          <div className="relative p-6 text-center transition border-2 border-dashed border-slate-300 rounded-2xl hover:border-primary hover:bg-primary/5">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setOldStudentsFile(e.target.files?.[0] ?? null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2 pointer-events-none">
              <Upload size={24} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-700">
                {oldStudentsFile ? oldStudentsFile.name : "Click to upload Excel file"}
              </p>
              <p className="text-xs text-gray-400">.xlsx or .xls only</p>
            </div>
          </div>
          {oldStudentsFile && (
            <Button
              testId={createTestId(PAGE, "btn-remove-old-students-file")}
              variant="outline"
              onClick={() => setOldStudentsFile(null)}
              className="p-0 mt-2 text-sm text-red-500 bg-transparent border-0 shadow-none hover:text-red-700"
            >
              <X size={14} />
              Remove file
            </Button>
          )}
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold text-slate-700">
            Degree <span className="text-red-500">*</span>
          </label>
          <select
            value={oldStudentsDegreeId}
            onChange={(e) => { setOldStudentsDegreeId(e.target.value); setOldStudentsCourseId(""); }}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          >
            <option value="">Select Degree</option>
            {degrees.map((d) => (
              <option key={d.id} value={d.id}>{d.degreeName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold text-slate-700">
            Course <span className="text-red-500">*</span>
          </label>
          <select
            value={oldStudentsCourseId}
            onChange={(e) => setOldStudentsCourseId(e.target.value)}
            disabled={!oldStudentsDegreeId}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:bg-slate-50 transition"
          >
            <option value="">{oldStudentsDegreeId ? "Select Course" : "Select a degree first"}</option>
            {filteredOldStudentsCourses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold text-slate-700">
            Academic Year <span className="text-red-500">*</span>
          </label>
          <select
            value={oldStudentsAcademicYearId}
            onChange={(e) => setOldStudentsAcademicYearId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          >
            <option value="">Select Academic Year</option>
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>{y.description ?? `${y.startDate} – ${y.endDate}`}</option>
            ))}
          </select>
        </div>

        <Button variant="primary" onClick={handleOldStudentsSave} disabled={oldStudentsSaving}>
          <Upload size={16} />
          {oldStudentsSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );

  const renderAcademicYearTab = () => {
    const columns = [
      {
        header: "Batch Year",
        // `batchYear` isn't on the AcademicYear model yet — see note in openAcademicYearModal.
        // Cast keeps the Table column typing happy until the field is added to the model.
        accessor: "batchYear" as unknown as keyof AcademicYear,
        render: (row: AcademicYear) => (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {(row as AcademicYear & { batchYear?: string }).batchYear || "—"}
          </span>
        ),
      },
      { header: "Start Date", accessor: "startDate" as const, render: (row: AcademicYear) => formatDate(row.startDate) },
      { header: "End Date", accessor: "endDate" as const, render: (row: AcademicYear) => formatDate(row.endDate) },
      { header: "Description", accessor: "description" as const },
      {
        header: "Actions",
        accessor: "id" as const,
        render: (row: AcademicYear) => (
          <RowActions
            onEdit={() => openAcademicYearModal(row)}
            onDelete={() => handleDeleteAcademicYear(row)}
            testIdBase={`academic-year-${row.id}`}
          />
        ),
      },
    ];

    return (
      <div className="space-y-6">
        <TabSectionHeader
          icon={<CalendarRange size={20} />}
          title="Academic Years"
          description="Define academic year batches with their date range."
          action={
            <Button
              variant="primary"
              onClick={() => openAcademicYearModal()}
              testId={createTestId("university-management", "add-academic-year-btn")}
            >
              <Plus size={18} />
              Add Academic Year
            </Button>
          }
        />

        <div className="pb-2 overflow-x-auto bg-white border shadow-sm rounded-2xl border-slate-200">
          <Table
            columns={columns}
            data={academicYears}
          />
        </div>

        <Modal
          open={academicYearModalOpen}
          title={selectedAcademicYear ? "Edit Academic Year" : "Add Academic Year"}
          onClose={() => setAcademicYearModalOpen(false)}
        >
          <div className="space-y-4">
            <Input
              label="Batch Year"
              placeholder="e.g., 1st Year, 2nd Year"
              value={academicYearForm.batchYear}
              onChange={(e) => setAcademicYearForm({ ...academicYearForm, batchYear: e.target.value })}
              testId={createTestId("university-management", "academic-year-batch-input")}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Start Date"
                type="date"
                value={academicYearForm.startDate ?? ""}
                onChange={(e) => setAcademicYearForm({ ...academicYearForm, startDate: e.target.value })}
                testId={createTestId("university-management", "academic-year-start-input")}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={academicYearForm.endDate ?? ""}
                onChange={(e) => setAcademicYearForm({ ...academicYearForm, endDate: e.target.value })}
                testId={createTestId("university-management", "academic-year-end-input")}
                required
              />
            </div>
            <Input
              label="Description"
              placeholder="Optional description"
              value={academicYearForm.description ?? ""}
              onChange={(e) => setAcademicYearForm({ ...academicYearForm, description: e.target.value })}
              testId={createTestId("university-management", "academic-year-description-input")}
              required
            />
            <div className="flex flex-col-reverse justify-end gap-3 pt-5 border-t sm:flex-row border-slate-100">
              <Button
                variant="outline"
                onClick={() => setAcademicYearModalOpen(false)}
                testId={createTestId("university-management", "academic-year-cancel-btn")}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={saveAcademicYear}
                testId={createTestId("university-management", "academic-year-save-btn")}
              >
                {selectedAcademicYear ? "Save Changes" : "Create Academic Year"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  };

  const renderSubjectTab = () => {
    const subjectColumns = [
      { header: "Name", accessor: "name" as const },
      { header: "Code", accessor: "code" as const },
      { header: "Max Marks", accessor: "maxMarks" as const },
      { header: "Min Marks", accessor: "minMarks" as const },
      {
        header: "Actions",
        accessor: "id" as const,
        render: (row: Subject) => (
          <RowActions
            onEdit={() => openSubjectModal(row)}
            onDelete={() => handleDeleteSubject(row)}
            testIdBase={`subject-${row.id}`}
          />
        ),
      },
    ];

    const courseSubjectColumns = [
      {
        header: "Degree",
        accessor: "degreeId" as const,
        render: (row: CourseSubject) =>
          degrees.find((d) => d.id === row.degreeId)?.degreeName ?? row.degreeId,
      },
      {
        header: "Course",
        accessor: "courseId" as const,
        render: (row: CourseSubject) =>
          courses.find((c) => c.id === row.courseId)?.name ?? row.courseId,
      },
      {
        header: "Semester",
        accessor: "semId" as const,
        render: (row: CourseSubject) =>
          semesterOptions.find((s) => s.id === row.semId)?.name ?? row.semId,
      },
      {
        header: "Subject",
        accessor: "subjectId" as const,
        render: (row: CourseSubject) =>
          subjects.find((s) => s.id === row.subjectId)?.name ?? row.subjectId,
      },
      {
        header: "Actions",
        accessor: "id" as const,
        render: (row: CourseSubject) => (
          <RowActions
            onEdit={() => openCourseSubjectModal(row)}
            onDelete={() => handleDeleteCourseSubject(row)}
            testIdBase={`course-subject-${row.id}`}
          />
        ),
      },
    ];

    return (
      <div className="space-y-8">

        <div className="space-y-4">
          <TabSectionHeader
            icon={<Library size={20} />}
            title="Subjects"
            description="Manage the subject catalogue used across courses."
            action={
              <Button variant="primary" onClick={() => openSubjectModal()} testId={createTestId("university-management", "add-subject-btn")}>
                <Plus size={18} />
                Add Subject
              </Button>
            }
          />
          <div className="pb-2 overflow-x-auto bg-white border shadow-sm rounded-2xl border-slate-200">
            <Table
              columns={subjectColumns}
              data={subjects}
            />
          </div>
        </div>


        <div className="space-y-4">
          <TabSectionHeader
            icon={<ListTree size={20} />}
            title="Course Subjects"
            description="Map subjects to courses and semesters."
            action={
              <Button variant="primary" onClick={() => openCourseSubjectModal()} testId={createTestId("university-management", "add-course-subject-btn")}>
                <Plus size={18} />
                Add Course Subject
              </Button>
            }
          />
          <div className="pb-2 overflow-x-auto bg-white border shadow-sm rounded-2xl border-slate-200">
            <Table
              columns={courseSubjectColumns}
              data={courseSubjects}
            />
          </div>
        </div>


        <Modal
          open={subjectModalOpen}
          title={selectedSubject ? "Edit Subject" : "Add Subject"}
          onClose={() => setSubjectModalOpen(false)}
        >
          <div className="space-y-4">
            <Input
              label="Subject Name"
              placeholder="e.g., Mathematics"
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              testId={createTestId("university-management", "subject-name-input")}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Code"
                placeholder="e.g., MATH101"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                testId={createTestId("university-management", "subject-code-input")}
                required
              />
              <Input
                label="Max Marks"
                type="number"
                min="1"
                value={subjectForm.maxMarks === 0 ? "" : subjectForm.maxMarks.toString()}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    setSubjectForm({ ...subjectForm, maxMarks: val });
                  } else if (e.target.value === "") {
                    setSubjectForm({ ...subjectForm, maxMarks: 0 });
                  }
                }}
                testId={createTestId("university-management", "subject-max-marks-input")}
                required
              />
              <Input
                label="Min Marks"
                type="number"
                min="1"
                value={subjectForm.minMarks === 0 ? "" : subjectForm.minMarks.toString()}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    setSubjectForm({ ...subjectForm, minMarks: val });
                  } else if (e.target.value === "") {
                    setSubjectForm({ ...subjectForm, minMarks: 0 });
                  }
                }}
                testId={createTestId("university-management", "subject-min-marks-input")}
                required
              />
            </div>
            <div className="flex flex-col-reverse justify-end gap-3 pt-5 border-t sm:flex-row border-slate-100">
              <Button variant="outline" onClick={() => setSubjectModalOpen(false)} testId={createTestId("university-management", "subject-cancel-btn")}>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveSubject} testId={createTestId("university-management", "subject-save-btn")}>
                {selectedSubject ? "Save Changes" : "Create Subject"}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={courseSubjectModalOpen}
          title={selectedCourseSubject ? "Edit Course Subject" : "Add Course Subject"}
          onClose={() => setCourseSubjectModalOpen(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Degree <span className="text-red-500">*</span>
              </label>
              <select
                data-testid={createTestId("university-management", "course-subject-degree-select")}
                value={courseSubjectForm.degreeId}
                onChange={(e) => setCourseSubjectForm({ ...courseSubjectForm, degreeId: e.target.value, courseId: "" })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              >
                <option value="">Select Degree</option>
                {degrees.map((d) => (
                  <option key={d.id} value={d.id}>{d.degreeName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Course <span className="text-red-500">*</span>
              </label>
              <select
                data-testid={createTestId("university-management", "course-subject-course-select")}
                value={courseSubjectForm.courseId}
                onChange={(e) => setCourseSubjectForm({ ...courseSubjectForm, courseId: e.target.value })}
                disabled={!courseSubjectForm.degreeId}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:bg-slate-50 transition"
              >
                <option value="">{courseSubjectForm.degreeId ? "Select Course" : "Select a degree first"}</option>
                {filteredCourseSubjectCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Semester <span className="text-red-500">*</span>
              </label>
              <select
                data-testid={createTestId("university-management", "course-subject-sem-select")}
                value={courseSubjectForm.semId}
                onChange={(e) => setCourseSubjectForm({ ...courseSubjectForm, semId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              >
                <option value="">Select Semester</option>
                {semesterOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                data-testid={createTestId("university-management", "course-subject-subject-select")}
                value={courseSubjectForm.subjectId}
                onChange={(e) => setCourseSubjectForm({ ...courseSubjectForm, subjectId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col-reverse justify-end gap-3 pt-5 border-t sm:flex-row border-slate-100">
              <Button variant="outline" onClick={() => setCourseSubjectModalOpen(false)} testId={createTestId("university-management", "course-subject-cancel-btn")}>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveCourseSubject} testId={createTestId("university-management", "course-subject-save-btn")}>
                {selectedCourseSubject ? "Save Changes" : "Create Mapping"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "university": return renderUniversityTab();
      case "notification": return renderNotificationTab();
      case "degree": return renderDegreeTab();
      case "course": return renderCourseTab();
      case "subject": return renderSubjectTab();
      case "academic-year": return renderAcademicYearTab();
      case "dates": return renderDatesTab();
      case "logins": return renderLoginsTab();
      case "lookup": return renderLookupTab();
      case "old-students": return renderOldStudentsTab();
      default: return null;
    }
  };

  const statCards = [
    { label: "Universities", value: universities.length, icon: <Building2 size={18} /> },
    { label: "Degrees", value: degrees.length, icon: <GraduationCap size={18} /> },
    { label: "Courses", value: courses.length, icon: <BookOpen size={18} /> },
    { label: "Academic Years", value: academicYears.length, icon: <CalendarRange size={18} /> },
  ];

  return (
    <AppLayout pageTitle="University Management">
      <div className="pb-8 space-y-6">

        <div className="relative p-6 overflow-hidden border rounded-2xl border-slate-200 bg-gradient-to-br from-primary/10 via-white to-white sm:p-7">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-text sm:text-3xl">University Management</h1>
              <p className="max-w-xl mt-2 text-sm text-gray-600 sm:text-base">
                Manage universities, degrees, courses, academic years, and system users from one place.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
              {statCards.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-3 px-4 py-3 border shadow-sm rounded-xl border-slate-200 bg-white/80 backdrop-blur"
                >
                  <span className="flex items-center justify-center rounded-lg h-9 w-9 bg-primary/10 text-primary shrink-0">
                    {stat.icon}
                  </span>
                  <div>
                    <p className="text-lg font-bold leading-none text-text">{stat.value}</p>
                    <p className="text-[11px] text-gray-500 whitespace-nowrap">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pb-2 overflow-x-auto bg-white border shadow-sm rounded-2xl border-slate-200">
          <div className="px-3 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/60 sm:px-4">
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TAB_DEFS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    data-testid={createTestId(PAGE, `tab-${tab.key}`)}
                    className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 sm:px-4 ${isActive
                      ? "bg-white text-primary shadow-md border border-slate-200"
                      : "text-slate-500 border border-transparent hover:text-slate-700 hover:bg-white/60"
                      }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {renderActiveTabContent()}
          </div>
        </div>
      </div>


      {confirmDialog && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm p-6 space-y-4 bg-white shadow-xl rounded-2xl">
            <p className="text-sm font-medium text-gray-800">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <Button
                testId={createTestId(PAGE, "btn-cancel-delete")}
                variant="outline"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </Button>

              <Button
                testId={createTestId(PAGE, "btn-confirm-delete")}
                variant="primary"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="bg-red-500 border-red-500 hover:bg-red-600"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999]">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}
    </AppLayout>
  );
}