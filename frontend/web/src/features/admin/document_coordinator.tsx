import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileCheck2,
  Info,
  Pencil,
  Trash2,
  CheckCircle2,
  Search,
  X,
  Users,
  BookOpen,
  UserPlus,
} from "lucide-react";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import Toast from "../../components/ui/Toast";
import Loader from "../../components/ui/Loader";
import EmptyState from "../../components/ui/EmptyState";
import Select from "../../components/ui/Select";
import AppLayout from "../../components/layouts/AppLayout";
import { createTestId } from "../../utils/testId";

import { getLookupsByType, type LookupResponse } from "../../services/lookupService";
import { getDegrees, type Degree } from "../../services/degreeService";
import { getCourses, type Course } from "../../services/courseService";
import { getLoginsByRoleId } from "../../services/loginService";
import {
  createDocumentCoordinators,
  getDocumentCoordinators,
  updateDocumentCoordinator,
  isCoordinatorMappingActive,
  type DocumentCoordinatorMapping,
  type CreateDocumentCoordinatorDto,
} from "../../services/documentCoordinatorService";
import AddFormMultiSelect from "../../components/ui/MultiselectDropdown";

const PAGE = "document-coordinator" as const;
const DOCUMENT_ADMIN_ROLE_NAME = "Document-Admin";

function isRowActive(m: DocumentCoordinatorMapping) {
  return isCoordinatorMappingActive(m.status);
}

type UsernameGroup = { username: string; items: DocumentCoordinatorMapping[] };

// Groups a (username-sorted) list of mappings into one entry per username,
// preserving the incoming order. A username with a single mapping renders
// as a flat row; a username with multiple mappings renders as an accordion.
function groupByUsername(items: DocumentCoordinatorMapping[]): UsernameGroup[] {
  const order: string[] = [];
  const map = new Map<string, DocumentCoordinatorMapping[]>();
  for (const item of items) {
    if (!map.has(item.username)) {
      map.set(item.username, []);
      order.push(item.username);
    }
    map.get(item.username)!.push(item);
  }
  return order.map((username) => ({ username, items: map.get(username)! }));
}

function CompactActions({
  isActive,
  toggling,
  onEdit,
  onToggleStatus,
  testIdBase,
}: {
  isActive: boolean;
  toggling: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  testIdBase: string;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={onEdit}
        title="Edit"
        aria-label="Edit"
        data-testid={createTestId(PAGE, `${testIdBase}-edit`)}
        className="p-1.5 text-yellow-500 transition-colors duration-150 rounded-full hover:bg-yellow-50 hover:text-yellow-600"
      >
        <Pencil size={15} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onToggleStatus}
        disabled={toggling}
        title={isActive ? "Deactivate" : "Reactivate"}
        aria-label={isActive ? "Deactivate" : "Reactivate"}
        data-testid={createTestId(PAGE, `${testIdBase}-toggle-status`)}
        className={
          isActive
            ? "p-1.5 text-red-500 transition-colors duration-150 rounded-full hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            : "p-1.5 text-emerald-500 transition-colors duration-150 rounded-full hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
        }
      >
        {isActive ? <Trash2 size={15} strokeWidth={2} /> : <CheckCircle2 size={15} strokeWidth={2} />}
      </button>
    </div>
  );
}

function initials(username: string) {
  const clean = username.replace(/[^a-zA-Z0-9]/g, "");
  return (clean.slice(0, 2) || username.slice(0, 2) || "??").toUpperCase();
}

export default function DocumentCoordinator() {
  // ── Toast / confirm ──────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const showConfirm = useCallback((message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm });
  }, []);

  // ── Master data ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [roleOptions, setRoleOptions] = useState<LookupResponse[]>([]);
  const [degreeTypeOptions, setDegreeTypeOptions] = useState<LookupResponse[]>([]);
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [mappings, setMappings] = useState<DocumentCoordinatorMapping[]>([]);

  const documentAdminRoleId = useMemo(
    () => roleOptions.find((r) => r.name?.toLowerCase() === DOCUMENT_ADMIN_ROLE_NAME.toLowerCase())?.id ?? "",
    [roleOptions]
  );

  const refreshMappings = useCallback(async () => {
    try {
      setMappings(await getDocumentCoordinators());
    } catch {
      showToast("Failed to refresh Document Coordinator mappings", "error");
    }
  }, [showToast]);

  useEffect(() => {
    const load = async () => {
      try {
        const [roles, degreeTypes, degreeData, courseData] = await Promise.all([
          getLookupsByType("Role"),
          getLookupsByType("DegreeType"),
          getDegrees(),
          getCourses(),
        ]);
        setRoleOptions(roles);
        setDegreeTypeOptions(degreeTypes);
        setDegrees(degreeData);
        setCourses(courseData);

        try {
          setMappings(await getDocumentCoordinators());
        } catch {
          // non-fatal — list just stays empty
        }
      } catch {
        showToast("Failed to load master data", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Usernames with the Document-Admin role ──────────────────────────────
  const [usernameOptions, setUsernameOptions] = useState<{ id: string; username: string; roleId: string }[]>([]);
  const [loadingUsernames, setLoadingUsernames] = useState(false);

  useEffect(() => {
    if (!documentAdminRoleId) return;
    setLoadingUsernames(true);
    getLoginsByRoleId(documentAdminRoleId)
      .then(setUsernameOptions)
      .catch(() => showToast("Failed to load Document Coordinator users", "error"))
      .finally(() => setLoadingUsernames(false));
  }, [documentAdminRoleId, showToast]);

  const degreeName = useCallback((id: string) => degrees.find((d) => d.id === id)?.degreeName ?? "—", [degrees]);
  const courseName = useCallback((id: string) => courses.find((c) => c.id === id)?.name ?? "—", [courses]);

  // ── Assign panel (left-hand form, always visible) ────────────────────────
  const [selectedUsername, setSelectedUsername] = useState("");
  const [selectedDegreeTypeId, setSelectedDegreeTypeId] = useState("");
  const [selectedDegreeIds, setSelectedDegreeIds] = useState<string[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const selectedDegreeTypeName = useMemo(
    () => degreeTypeOptions.find((dt) => dt.id === selectedDegreeTypeId)?.name ?? "",
    [degreeTypeOptions, selectedDegreeTypeId]
  );

  const selectedLoginId = useMemo(
    () => usernameOptions.find((u) => u.username === selectedUsername)?.id ?? "",
    [usernameOptions, selectedUsername]
  );

  // What this coordinator is already assigned — fetched straight from the
  // loaded mappings so the admin can see current coverage before adding more.
  const alreadyAssigned = useMemo(
    () =>
      selectedLoginId
        ? mappings.filter((m) => m.loginId === selectedLoginId && isRowActive(m))
        : [],
    [mappings, selectedLoginId]
  );

  const resetAssignForm = () => {
    setSelectedUsername("");
    setSelectedDegreeTypeId("");
    setSelectedDegreeIds([]);
    setSelectedCourseIds([]);
  };

  const handleOpenAssign = () => {
    resetAssignForm();
    setAssignOpen(true);
  };

  const handleCloseAssign = () => {
    setAssignOpen(false);
    resetAssignForm();
  };

  const handleUsernameChange = (username: string) => {
    setSelectedUsername(username);
    setSelectedDegreeTypeId("");
    setSelectedDegreeIds([]);
    setSelectedCourseIds([]);
  };

  const handleDegreeTypeChange = (degreeTypeId: string) => {
    setSelectedDegreeTypeId(degreeTypeId);
    setSelectedDegreeIds([]);
    setSelectedCourseIds([]);
  };

  // Course ids already actively assigned to the selected username — used to
  // hide degrees/courses that have nothing left to add.
  const assignedCourseIds = useMemo(
    () => new Set(alreadyAssigned.map((m) => m.courseId)),
    [alreadyAssigned]
  );

  // All degrees under the selected degree type, before filtering out ones
  // that are already fully assigned to this user.
  const degreesForRegistrationType = useMemo(() => {
    if (!selectedDegreeTypeId) return [];
    return degrees.filter(
      (d) => (d as unknown as { degreeTypeId?: string }).degreeTypeId === selectedDegreeTypeId
    );
  }, [degrees, selectedDegreeTypeId]);

  // Same list, minus any degree whose courses are all already assigned to
  // this user (nothing left under it to add). A degree with no courses at
  // all is left visible rather than hidden.
  const degreeOptions = useMemo(
    () =>
      degreesForRegistrationType.filter((d) => {
        const coursesUnderDegree = courses.filter((c) => c.degreeId === d.id);
        return coursesUnderDegree.length === 0 || coursesUnderDegree.some((c) => !assignedCourseIds.has(c.id));
      }),
    [degreesForRegistrationType, courses, assignedCourseIds]
  );

  // When exactly one degree is available for this registration, auto-populate
  // it instead of making the admin pick from a single-item dropdown.
  useEffect(() => {
    if (degreeOptions.length === 1) {
      const onlyId = degreeOptions[0].id;
      setSelectedDegreeIds((prev) => (prev.length === 1 && prev[0] === onlyId ? prev : [onlyId]));
    }
  }, [degreeOptions]);

  const courseOptions = useMemo(() => {
    if (selectedDegreeIds.length === 0) return [];
    return courses.filter((c) => selectedDegreeIds.includes(c.degreeId) && !assignedCourseIds.has(c.id));
  }, [courses, selectedDegreeIds, assignedCourseIds]);

  useEffect(() => {
    if (selectedDegreeIds.length === 0) return;
    if (courseOptions.length === 1) {
      const onlyId = courseOptions[0].id;
      setSelectedCourseIds((prev) => (prev.length === 1 && prev[0] === onlyId ? prev : [onlyId]));
    }
  }, [courseOptions, selectedDegreeIds.length]);

  useEffect(() => {
    setSelectedCourseIds((prev) => prev.filter((id) => courseOptions.some((c) => c.id === id)));
  }, [courseOptions]);

  const handleSave = async () => {
    if (!selectedUsername) { showToast("Select a Document Coordinator username", "error"); return; }
    if (!selectedLoginId) { showToast("Could not resolve a login for this username", "error"); return; }
    if (!selectedDegreeTypeId) { showToast("Select a degree type", "error"); return; }
    if (selectedDegreeIds.length === 0) { showToast("Select at least one degree", "error"); return; }
    if (selectedCourseIds.length === 0) { showToast("Select at least one course", "error"); return; }

    const alreadyMappedCourseIds = new Set(alreadyAssigned.map((m) => m.courseId));

    const newCourseIds = selectedCourseIds.filter((id) => !alreadyMappedCourseIds.has(id));
    if (newCourseIds.length === 0) {
      showToast("All selected courses are already assigned to this user", "error");
      return;
    }

    const payload: CreateDocumentCoordinatorDto[] = newCourseIds.map((courseId) => {
      const course = courses.find((c) => c.id === courseId);
      return {
        loginId: selectedLoginId,
        degreeId: course?.degreeId ?? "",
        courseId,
        degreeTypeId: selectedDegreeTypeId,
      };
    });

    setSaving(true);
    try {
      await createDocumentCoordinators(payload);
      await refreshMappings();
      showToast("Document Coordinator mapping saved successfully", "success");
      resetAssignForm();
      setAssignOpen(false);
    } catch {
      showToast("Failed to save mapping", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<DocumentCoordinatorMapping | null>(null);
  const [editDegreeId, setEditDegreeId] = useState("");
  const [editCourseId, setEditCourseId] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = (record: DocumentCoordinatorMapping) => {
    setEditRecord(record);
    setEditDegreeId(record.degreeId);
    setEditCourseId(record.courseId);
    setEditOpen(true);
  };

  const editDegreeOptions = useMemo(() => {
    if (!editRecord?.degreeTypeId) return [];
    return degrees.filter(
      (d) => (d as unknown as { degreeTypeId?: string }).degreeTypeId === editRecord.degreeTypeId
    );
  }, [degrees, editRecord]);

  const editCourseOptions = useMemo(() => {
    if (!editDegreeId) return [];
    return courses.filter((c) => c.degreeId === editDegreeId);
  }, [courses, editDegreeId]);

  const handleUpdate = async () => {
    if (!editRecord) return;
    if (!editDegreeId || !editCourseId) {
      showToast("Select both a degree and a course", "error");
      return;
    }
    setEditSaving(true);
    try {
      await updateDocumentCoordinator({
        id: editRecord.id,
        loginId: editRecord.loginId,
        degreeTypeId: editRecord.degreeTypeId,
        degreeId: editDegreeId,
        courseId: editCourseId,
      });
      await refreshMappings();
      showToast("Mapping updated successfully", "success");
      setEditOpen(false);
    } catch {
      showToast("Failed to update mapping", "error");
    } finally {
      setEditSaving(false);
    }
  };

  // ── Status toggle (soft delete) ──────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const setMappingStatus = async (record: DocumentCoordinatorMapping, nextStatus: boolean) => {
    setTogglingId(record.id);
    setMappings((prev) => prev.map((m) => (m.id === record.id ? { ...m, status: nextStatus } : m)));
    try {
      await updateDocumentCoordinator({
        id: record.id,
        loginId: record.loginId,
        degreeTypeId: record.degreeTypeId,
        degreeId: record.degreeId,
        courseId: record.courseId,
        status: nextStatus,
      });
      await refreshMappings();
      showToast(
        nextStatus ? `Reactivated ${record.username}'s mapping` : `Deactivated ${record.username}'s mapping`,
        "success"
      );
    } catch {
      setMappings((prev) => prev.map((m) => (m.id === record.id ? { ...m, status: !nextStatus } : m)));
      showToast(nextStatus ? "Failed to reactivate mapping" : "Failed to deactivate mapping", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const deactivateMapping = (record: DocumentCoordinatorMapping) => setMappingStatus(record, false);
  const reactivateMapping = (record: DocumentCoordinatorMapping) => setMappingStatus(record, true);

  const handleToggleStatus = (record: DocumentCoordinatorMapping) => {
    if (togglingId === record.id) return;
    if (isRowActive(record)) {
      showConfirm(`Deactivate ${record.username}'s mapping for "${courseName(record.courseId)}"?`, () =>
        deactivateMapping(record)
      );
    } else {
      reactivateMapping(record);
    }
  };

  // ── Search + active/inactive lists, grouped by username into accordions where a user has multiple mappings ──
  const [search, setSearch] = useState("");

  const filteredMappings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mappings;
    return mappings.filter((m) => {
      const dName = (m.degreeName ?? degreeName(m.degreeId)).toLowerCase();
      const cName = (m.courseName ?? courseName(m.courseId)).toLowerCase();
      return m.username?.toLowerCase().includes(q) || dName.includes(q) || cName.includes(q);
    });
  }, [mappings, search, degreeName, courseName]);

  const sortMappings = (items: DocumentCoordinatorMapping[]) =>
    [...items].sort((a, b) => {
      const byUsername = a.username.localeCompare(b.username);
      if (byUsername !== 0) return byUsername;
      const aCourse = a.courseName ?? courseName(a.courseId);
      const bCourse = b.courseName ?? courseName(b.courseId);
      return aCourse.localeCompare(bCourse);
    });

  // Single combined list — every mapping, active or inactive, grouped by
  // username. Status is shown per-assignment via a label instead of
  // splitting into separate Active/Inactive sections.
  const combinedGroups = useMemo(
    () => groupByUsername(sortMappings(filteredMappings)),
    [filteredMappings]
  );

  const totalCoordinators = useMemo(() => new Set(mappings.map((m) => m.loginId)).size, [mappings]);
  const distinctDegreesCovered = useMemo(() => new Set(mappings.map((m) => m.degreeId)).size, [mappings]);
  const activeMappingCount = useMemo(() => mappings.filter((m) => isRowActive(m)).length, [mappings]);
  const inactiveMappingCount = mappings.length - activeMappingCount;

  if (loading) {
    return (
      <AppLayout pageTitle="Document Coordinator Mapping">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Document Coordinator Mapping">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      <div className="px-4 py-6 mx-auto space-y-6 sm:px-6 sm:py-8 lg:px-8" data-testid={PAGE}>
        {/* ── Page header ── */}
        <div className="relative overflow-hidden border rounded-2xl sm:rounded-3xl border-primary bg-primary/5">
          <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:p-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3.5 sm:gap-4">
              <div className="flex items-center justify-center text-white w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-primary/70">
                <FileCheck2 size={22} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight sm:text-xl text-slate-900">Document Coordinator Mapping</h1>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500 max-w-md">
                  Assign a Document Coordinator user to the degrees and courses whose applications they'll verify.
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs sm:text-sm">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                    <Users size={13} />
                    {totalCoordinators} Coordinator{totalCoordinators === 1 ? "" : "s"}
                  </span>
                  <span className="hidden w-1 h-1 rounded-full bg-slate-300 sm:inline-block" />
                  <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700">
                    <BookOpen size={13} className="text-blue-500" />
                    {distinctDegreesCovered} Degree{distinctDegreesCovered === 1 ? "" : "s"} Covered
                  </span>
                  <span className="hidden w-1 h-1 rounded-full bg-slate-300 sm:inline-block" />
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {activeMappingCount} Active
                  </span>
                  <span className="hidden w-1 h-1 rounded-full bg-slate-300 sm:inline-block" />
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    {inactiveMappingCount} Inactive
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Toolbar: search (once there's something to search) + Assign trigger ── */}
        <Card className="rounded-2xl border-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {mappings.length > 0 ? (
              <div className="relative flex-1 min-w-0 sm:max-w-sm">
                <Search size={15} className="absolute -translate-y-1/2 pointer-events-none left-3 top-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by username, degree or course…"
                  data-testid={createTestId(PAGE, "search-input")}
                  className="w-full py-2.5 pr-8 text-sm transition border rounded-xl pl-9 border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute -translate-y-1/2 right-2 top-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No coordinators assigned yet.</p>
            )}

            <Button
              variant="primary"
              onClick={handleOpenAssign}
              testId={createTestId(PAGE, "open-assign-btn")}
              className="shrink-0"
            >
              <span className="inline-flex items-center gap-2">
                <UserPlus size={16} />
                Assign Coordinator
              </span>
            </Button>
          </div>
        </Card>

        {/* ── Assignments panel (full width — the only list on the page now) ── */}
        <Card className="flex flex-col rounded-2xl border-slate-200">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
                <Users size={19} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Assignments</h2>
                <p className="text-xs text-slate-500">
                  {activeMappingCount} active
                  <span className="mx-1 text-slate-300">•</span>
                  {inactiveMappingCount} inactive
                </p>
              </div>
            </div>

            <div>
              {mappings.length === 0 && (
                <EmptyState
                  title="No assignments yet"
                  description="Assign a Document Coordinator to get started."
                  actionLabel="Assign Coordinator"
                  onAction={handleOpenAssign}
                />
              )}

              {mappings.length > 0 && filteredMappings.length === 0 && (
                <EmptyState
                  title="No matches found"
                  description={`No coordinator, degree or course matches "${search}".`}
                  actionLabel="Clear search"
                  onAction={() => setSearch("")}
                />
              )}

              {combinedGroups.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {combinedGroups.map((group) => (
                    <div
                      key={group.username}
                      className="p-4 transition-shadow bg-white border rounded-xl border-slate-200 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 mb-3">
                        <span className="flex items-center justify-center w-8 h-8 text-[11px] font-bold rounded-full bg-primary/10 text-primary shrink-0">
                          {initials(group.username)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate text-slate-800">{group.username}</p>
                          <p className="text-xs text-slate-400">
                            {group.items.length} assignment{group.items.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {group.items.map((item) => {
                          const active = isRowActive(item);
                          return (
                            <div
                              key={item.id}
                              className="flex items-start justify-between gap-2 px-3 py-2.5 rounded-lg bg-slate-50"
                            >
                              <p className="text-xs font-medium leading-snug text-slate-700">
                                {item.degreeName ?? degreeName(item.degreeId)} • {item.courseName ?? courseName(item.courseId)}
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={
                                    active
                                      ? "px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700"
                                      : "px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-500"
                                  }
                                >
                                  {active ? "Active" : "Inactive"}
                                </span>
                                <CompactActions
                                  isActive={active}
                                  toggling={togglingId === item.id}
                                  onEdit={() => openEdit(item)}
                                  onToggleStatus={() => handleToggleStatus(item)}
                                  testIdBase={`mapping-${item.id}`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
      </div>

      {/* ── Assign modal ── */}
      <Modal
        open={assignOpen}
        title="Assign Document Coordinator"
        onClose={handleCloseAssign}
      >
        <div className="space-y-5">
          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">
              Document Coordinator Username <span className="text-red-500">*</span>
            </label>
            <select
              data-testid={createTestId(PAGE, "username-select")}
              value={selectedUsername}
              onChange={(e) => handleUsernameChange(e.target.value)}
              disabled={loadingUsernames}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            >
              <option value="">
                {loadingUsernames ? "Loading usernames..." : "Select a username..."}
              </option>
              {usernameOptions.map((u) => (
                <option key={u.username} value={u.username}>{u.username}</option>
              ))}
            </select>
            {!loadingUsernames && usernameOptions.length === 0 && (
              <p className="mt-1.5 text-xs text-gray-400">
                No users found with the "{DOCUMENT_ADMIN_ROLE_NAME}" role.
              </p>
            )}
          </div>

          {selectedUsername && (
            <>
              <div>
                <label className="block mb-2 text-sm font-semibold text-slate-700">
                  Degree Type <span className="text-red-500">*</span>
                </label>
                <select
                  data-testid={createTestId(PAGE, "degree-type-select")}
                  value={selectedDegreeTypeId}
                  onChange={(e) => handleDegreeTypeChange(e.target.value)}
                  disabled={degreeTypeOptions.length === 0}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                >
                  <option value="">
                    {degreeTypeOptions.length === 0 ? "Loading degree types..." : "Select a degree type..."}
                  </option>
                  {degreeTypeOptions.map((dt) => (
                    <option key={dt.id} value={dt.id}>{dt.name}</option>
                  ))}
                </select>
              </div>

              {/* Already-assigned coverage, pulled from the mappings already loaded */}
              {alreadyAssigned.length > 0 && (
                <div className="px-4 py-3 border border-blue-100 rounded-xl bg-blue-50/60">
                  <div className="flex items-center gap-2">
                    <Info size={16} className="text-blue-500 shrink-0" />
                    <p className="text-xs font-semibold text-blue-800">
                      Already assigned to {selectedUsername} ({alreadyAssigned.length})
                    </p>
                  </div>
                  <div className="mt-2.5 space-y-1.5 max-h-32 overflow-y-auto">
                    {alreadyAssigned.map((m) => (
                      <div
                        key={m.id}
                        className="px-3 py-2 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg"
                      >
                        <span className="text-slate-700">{m.degreeName ?? degreeName(m.degreeId)}</span>
                        <span className="mx-1.5 text-blue-300">•</span>
                        <span>{m.courseName ?? courseName(m.courseId)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDegreeTypeId && (
                degreeOptions.length === 0 ? (
                  <div className="flex items-start gap-2.5 px-4 py-3 border rounded-xl border-amber-100 bg-amber-50/60">
                    <Info size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs leading-relaxed text-amber-800">
                      {degreesForRegistrationType.length === 0
                        ? `No degrees are set up for the "${selectedDegreeTypeName}" degree type yet.`
                        : `${selectedUsername} is already assigned to every degree and course under "${selectedDegreeTypeName}".`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AddFormMultiSelect
                      label="Degree"
                      required
                      options={degreeOptions.map((d) => ({ id: d.id, name: d.degreeName }))}
                      selectedIds={selectedDegreeIds}
                      onChange={(ids) => setSelectedDegreeIds(ids)}
                    />
                    <AddFormMultiSelect
                      label="Course"
                      required
                      options={courseOptions.map((c) => ({ id: c.id, name: c.name }))}
                      selectedIds={selectedCourseIds}
                      onChange={(ids) => setSelectedCourseIds(ids)}
                      disabled={selectedDegreeIds.length === 0}
                      helperText={
                        selectedDegreeIds.length === 0
                          ? undefined
                          : `${courseOptions.length} course${courseOptions.length === 1 ? "" : "s"} available for the selected degree(s)`
                      }
                    />
                  </div>
                )
              )}
            </>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={handleCloseAssign} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={
                saving ||
                !selectedUsername ||
                !selectedDegreeTypeId ||
                selectedDegreeIds.length === 0 ||
                selectedCourseIds.length === 0
              }
              testId={createTestId(PAGE, "save-btn")}
            >
              {saving ? "Saving..." : "Save Mapping"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Edit modal ── */}
      <Modal
        open={editOpen}
        title="Edit Document Coordinator Mapping"
        onClose={() => setEditOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs text-gray-400">Username</p>
            <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium text-text border border-slate-200">
              {editRecord?.username}
            </p>
          </div>
          <Select
            label="Degree"
            name="editDegree"
            options={editDegreeOptions.map((d) => ({ label: d.degreeName, value: d.id }))}
            value={editDegreeId}
            onChange={(e) => { setEditDegreeId(e.target.value); setEditCourseId(""); }}
            placeholder="Select Degree"
            required
          />
          <Select
            label="Course"
            name="editCourse"
            options={editCourseOptions.map((c) => ({ label: c.name, value: c.id }))}
            value={editCourseId}
            onChange={(e) => setEditCourseId(e.target.value)}
            placeholder={editDegreeId ? "Select Course" : "Select a degree first"}
            required
            disabled={!editDegreeId}
          />
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleUpdate}
              disabled={editSaving || !editDegreeId || !editCourseId}
              testId={createTestId(PAGE, "edit-save-btn")}
            >
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Confirm dialog ── */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm p-6 space-y-4 bg-white shadow-xl rounded-2xl">
            <p className="text-sm font-medium text-gray-800">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                className="bg-red-500 border-red-500 hover:bg-red-600"
              >
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}