import { useState, useEffect, useMemo, useRef } from "react";
import { Pencil, Check, X, FileText, ChevronDown } from "lucide-react";
import AppLayout from "../../components/layouts/AppLayout";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Checkbox from "../../components/ui/Checkbox";
import Pagination from "../../components/ui/Pagination";
import { createTestId } from "../../utils/testId";
import { getDegrees, type Degree } from "../../services/degreeService";
import { getCourses, type Course } from "../../services/courseService";
import {
  getLookupsByType,
  type LookupResponse,
} from "../../services/lookupService";
import {
  getExamApplications,
  type ExamApplication,
} from "../../services/examApplicationService";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type HallTicketRow = ExamApplication & {
  degreeName: string;
  courseName: string;
  semName: string;
};

type EditState = {
  applicationNo: string;
  name: string;
  regisNumber: string;
  degreeId: string;
  courseId: string;
  semId: string;
};

type FilterKey = "degree" | "course" | "semester" | null;

const PAGE = "hall-ticket" as const;
const ROWS_PER_PAGE = 10;

/* ─── Controlled multi-select filter ────────────────────────────────────────
   Accepts an `open` boolean and an `onToggle` callback so the parent can
   enforce only-one-open-at-a-time across all three filter dropdowns.
────────────────────────────────────────────────────────────────────────────── */

type FilterOption = { label: string; value: string };

function ControlledFilter({
  label,
  options,
  values,
  open,
  onToggle,
  onChange,
  testId,
}: {
  label: string;
  options: FilterOption[];
  values: string[];
  open: boolean;
  onToggle: () => void;
  onChange: (vals: string[]) => void;
  testId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onToggle(); // caller sets open→false
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onToggle]);

  const toggle = (val: string) => {
    onChange(
      values.includes(val) ? values.filter((v) => v !== val) : [...values, val],
    );
  };

  const toggleAll = () => {
    onChange(values.length === options.length ? [] : options.map((o) => o.value));
  };

  return (
    <div ref={ref} className="relative min-w-[150px] flex-1 sm:flex-none">
      <button
        data-testid={testId}
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm bg-white transition-colors ${open
            ? "border-primary ring-2 ring-primary/20 text-primary"
            : "border-gray-300 text-gray-700 hover:border-primary/50"
          }`}
      >
        <span className="truncate">
          {label}
          {values.length > 0 && (
            <span className="ml-1.5 font-semibold text-primary">
              ({values.length})
            </span>
          )}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180 text-primary" : "text-gray-400"}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[180px] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {/* Options list */}
          <div className="py-1 overflow-y-auto max-h-56">
            {options.length === 0 ? (
              <p className="px-4 py-3 text-xs text-gray-400">No options available</p>
            ) : (
              options.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={values.includes(opt.value)}
                    onChange={() => toggle(opt.value)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-primary accent-primary"
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              ))
            )}
          </div>

          {/* Footer: select-all + clear */}
          {options.length > 0 && (
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-gray-100 bg-gray-50">
              <button
                onClick={toggleAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                {values.length === options.length ? "Deselect all" : "Select all"}
              </button>
              {values.length > 0 && (
                <button
                  onClick={() => onChange([])}
                  className="text-xs text-gray-400 transition hover:text-red-500"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */

export default function HallTicket() {
  /* ── Reference data ── */
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<LookupResponse[]>([]);
  const [applications, setApplications] = useState<ExamApplication[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Filters — which dropdown is open (only one at a time) ── */
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);
  const [filterDegree, setFilterDegree] = useState<string[]>([]);
  const [filterCourse, setFilterCourse] = useState<string[]>([]);
  const [filterSemester, setFilterSemester] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  /* ── Pagination ── */
  const [page, setPage] = useState(1);

  /* ── Selection ── */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ── Inline edit ── */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    applicationNo: "",
    name: "",
    regisNumber: "",
    degreeId: "",
    courseId: "",
    semId: "",
  });

  /* ── Toast ── */
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  /* ── Generating ── */
  const [generating, setGenerating] = useState(false);

  /* ─── Load data ──────────────────────────────────────────────────────────── */

  useEffect(() => {
    Promise.all([
      getDegrees(),
      getCourses(),
      getLookupsByType("Semester"),
      getExamApplications(),
    ])
      .then(([deg, crs, sems, apps]) => {
        setDegrees(deg);
        setCourses(crs);
        setSemesters(sems);
        setApplications(apps);
      })
      .finally(() => setLoading(false));
  }, []);

  /* ─── Lookup helpers ─────────────────────────────────────────────────────── */

  const degreeNameById = (id: string) =>
    degrees.find((d) => d.id === id)?.degreeName ?? id;

  const courseNameById = (id: string) =>
    courses.find((c) => c.id === id)?.name ?? id;

  const semNameById = (id: string) =>
    semesters.find((s) => s.id === id)?.name ?? id;

  /* ─── Courses scoped to degree being edited ──────────────────────────────── */

  const editScopedCourses = useMemo(
    () =>
      editState.degreeId
        ? courses.filter((c) => c.degreeId === editState.degreeId)
        : courses,
    [editState.degreeId, courses],
  );

  /* ─── Filter course options (scoped to selected degree filters) ──────────── */

  const filterCourseOptions = useMemo(() => {
    const base = filterDegree.length
      ? courses.filter((c) => filterDegree.includes(c.degreeId))
      : courses;
    return base.map((c) => ({ label: c.name, value: c.id }));
  }, [filterDegree, courses]);

  /* ─── Toggle filter open — one at a time ─────────────────────────────────── */

  const toggleFilter = (key: FilterKey) => {
    setOpenFilter((prev) => (prev === key ? null : key));
  };

  /* ─── Filtered rows ──────────────────────────────────────────────────────── */

  const filteredRows = useMemo<HallTicketRow[]>(() => {
    const q = search.trim().toLowerCase();
    return applications
      .filter((a) => {
        if (filterDegree.length && !filterDegree.includes(a.degreeId)) return false;
        if (filterCourse.length && !filterCourse.includes(a.courseId)) return false;
        if (filterSemester.length && !filterSemester.includes(a.semId)) return false;
        if (q) {
          const haystack = [a.name, a.applicationNo, a.regisNumber]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .map((a) => ({
        ...a,
        degreeName: degreeNameById(a.degreeId),
        courseName: courseNameById(a.courseId),
        semName: semNameById(a.semId),
      }));
  }, [
    applications,
    filterDegree,
    filterCourse,
    filterSemester,
    search,
    degrees,
    courses,
    semesters,
  ]);

  /* Reset page on filter change */
  useEffect(() => {
    setPage(1);
  }, [filterDegree, filterCourse, filterSemester, search]);

  /* ─── Paginated rows ─────────────────────────────────────────────────────── */

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
  const pagedRows = filteredRows.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );

  /* ─── Select-all helpers ─────────────────────────────────────────────────── */

  const visibleIds = pagedRows.map((r) => r.id);
  const allPageSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const somePageSelected =
    !allPageSelected && visibleIds.some((id) => selectedIds.has(id));

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected;
    }
  }, [somePageSelected]);

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ─── Inline edit helpers ────────────────────────────────────────────────── */

  const startEdit = (row: HallTicketRow) => {
    setEditingId(row.id);
    setEditState({
      applicationNo: row.applicationNo,
      name: row.name,
      regisNumber: row.regisNumber,
      degreeId: row.degreeId,
      courseId: row.courseId,
      semId: row.semId,
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (rowId: string) => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === rowId
          ? {
            ...a,
            applicationNo: editState.applicationNo,
            name: editState.name,
            regisNumber: editState.regisNumber,
            degreeId: editState.degreeId,
            courseId: editState.courseId,
            semId: editState.semId,
          }
          : a,
      ),
    );
    setEditingId(null);
    setToast({ message: "Row updated successfully.", type: "success" });
  };

  /* ─── Generate hall tickets ──────────────────────────────────────────────── */

  const handleGenerate = async () => {
    if (selectedIds.size === 0) return;
    setGenerating(true);
    try {
      // Replace with actual service call: await generateHallTickets([...selectedIds]);
      await new Promise((r) => setTimeout(r, 1200));
      setToast({
        message: `Hall tickets generated for ${selectedIds.size} student${selectedIds.size !== 1 ? "s" : ""}.`,
        type: "success",
      });
      setSelectedIds(new Set());
    } catch {
      setToast({ message: "Failed to generate hall tickets.", type: "error" });
    } finally {
      setGenerating(false);
    }
  };

  /* ─── Helpers ────────────────────────────────────────────────────────────── */

  const hasActiveFilters =
    filterDegree.length > 0 ||
    filterCourse.length > 0 ||
    filterSemester.length > 0 ||
    search.trim().length > 0;

  const clearFilters = () => {
    setFilterDegree([]);
    setFilterCourse([]);
    setFilterSemester([]);
    setSearch("");
  };

  /* ─── JSX ────────────────────────────────────────────────────────────────── */

  return (
    <AppLayout pageTitle="Hall Ticket">
      <div className="space-y-6 ">

        {/* ── Filter + search card ── */}
        <div className="p-4 space-y-3 bg-white border border-gray-200 shadow-sm rounded-xl">

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold tracking-wider text-gray-400 uppercase">
              Filter by
            </span>

            <ControlledFilter
              label="Degree"
              options={degrees.map((d) => ({ label: d.degreeName, value: d.id }))}
              values={filterDegree}
              open={openFilter === "degree"}
              onToggle={() => toggleFilter("degree")}
              onChange={(vals) => {
                setFilterDegree(vals);
                setFilterCourse([]);
              }}
              testId={createTestId(PAGE, "filter-degree")}
            />

            <ControlledFilter
              label="Course"
              options={filterCourseOptions}
              values={filterCourse}
              open={openFilter === "course"}
              onToggle={() => toggleFilter("course")}
              onChange={setFilterCourse}
              testId={createTestId(PAGE, "filter-course")}
            />

            <ControlledFilter
              label="Semester"
              options={semesters.map((s) => ({ label: s.name ?? s.id, value: s.id }))}
              values={filterSemester}
              open={openFilter === "semester"}
              onToggle={() => toggleFilter("semester")}
              onChange={setFilterSemester}
              testId={createTestId(PAGE, "filter-semester")}
            />

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                data-testid={createTestId(PAGE, "btn-clear-filters")}
                className="ml-1 text-xs font-medium text-red-500 underline transition hover:text-red-600 underline-offset-2 whitespace-nowrap"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Search */}
          <Input
            variant="search"
            placeholder="Search by student name, application no, or reg. number…"
            value={search}
            onClear={() => setSearch("")}
            onChange={(e) => setSearch(e.target.value)}
            testId={createTestId(PAGE, "search")}
          />
        </div>

        {/* ── Table card ── */}
        <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">

              {/* ── Head ── */}
              <thead className="text-white bg-primary">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAll}
                      data-testid={createTestId(PAGE, "chk-all")}
                      className="w-4 h-4 rounded cursor-pointer border-white/40 accent-white"
                    />
                  </th>
                  {[
                    "Application No",
                    "Student Name",
                    "Reg. Number",
                    "Degree",
                    "Course",
                    "Semester",
                    "Academic",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold tracking-wider text-left uppercase whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-semibold tracking-wider text-center uppercase">
                    Actions
                  </th>
                </tr>
              </thead>

              {/* ── Body ── */}
              <tbody className="bg-white divide-y divide-gray-100">

                {/* Loading */}
                {loading && (
                  <tr>
                    <td colSpan={9} className="py-16 text-sm text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-2 rounded-full animate-spin border-primary border-t-transparent" />
                        Loading students…
                      </div>
                    </td>
                  </tr>
                )}

                {/* Empty */}
                {!loading && pagedRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-16 text-sm text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <FileText size={32} className="text-gray-300" />
                        No students match the current filters.
                      </div>
                    </td>
                  </tr>
                )}

                {/* Data rows */}
                {!loading &&
                  pagedRows.map((row) => {
                    const isEditing = editingId === row.id;
                    const isSelected = selectedIds.has(row.id);

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${isEditing
                            ? "bg-amber-50"
                            : isSelected
                              ? "bg-primary/5"
                              : "hover:bg-gray-50/80"
                          }`}
                      >
                        {/* Checkbox */}
                        <td className="w-12 px-4 py-3">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleRow(row.id)}
                            testId={createTestId(PAGE, `chk-row-${row.id}`)}
                          />
                        </td>

                        {/* Application No */}
                        <td className="px-4 py-3 min-w-[140px]">
                          {isEditing ? (
                            <Input
                              value={editState.applicationNo}
                              placeholder="Application No"
                              testId={createTestId(PAGE, `inp-appno-${row.id}`)}
                              onChange={(e) =>
                                setEditState((prev) => ({ ...prev, applicationNo: e.target.value }))
                              }
                            />
                          ) : (
                            <span className="font-mono text-xs text-gray-500 whitespace-nowrap">
                              {row.applicationNo}
                            </span>
                          )}
                        </td>

                        {/* Student Name */}
                        <td className="px-4 py-3 min-w-[160px]">
                          {isEditing ? (
                            <Input
                              value={editState.name}
                              placeholder="Student Name"
                              testId={createTestId(PAGE, `inp-name-${row.id}`)}
                              onChange={(e) =>
                                setEditState((prev) => ({ ...prev, name: e.target.value }))
                              }
                            />
                          ) : (
                            <span className="font-medium text-text whitespace-nowrap">
                              {row.name}
                            </span>
                          )}
                        </td>

                        {/* Reg. Number */}
                        <td className="px-4 py-3 min-w-[140px]">
                          {isEditing ? (
                            <Input
                              value={editState.regisNumber}
                              placeholder="Reg. Number"
                              testId={createTestId(PAGE, `inp-regno-${row.id}`)}
                              onChange={(e) =>
                                setEditState((prev) => ({ ...prev, regisNumber: e.target.value }))
                              }
                            />
                          ) : (
                            <span className="font-mono text-xs text-gray-500 whitespace-nowrap">
                              {row.regisNumber}
                            </span>
                          )}
                        </td>

                        {/* Degree */}
                        <td className="px-4 py-3 min-w-[150px]">
                          {isEditing ? (
                            <Select
                              options={degrees.map((d) => ({
                                label: d.degreeName,
                                value: d.id,
                              }))}
                              value={editState.degreeId}
                              placeholder="Select degree"
                              testId={createTestId(PAGE, `sel-degree-${row.id}`)}
                              onChange={(e) =>
                                setEditState((prev) => ({
                                  ...prev,
                                  degreeId: e.target.value,
                                  courseId: "",
                                }))
                              }
                            />
                          ) : (
                            <span className="text-text">{row.degreeName}</span>
                          )}
                        </td>

                        {/* Course — scoped to selected degree */}
                        <td className="px-4 py-3 min-w-[160px]">
                          {isEditing ? (
                            <Select
                              options={editScopedCourses.map((c) => ({
                                label: c.name,
                                value: c.id,
                              }))}
                              value={editState.courseId}
                              placeholder={
                                editState.degreeId ? "Select course" : "Select degree first"
                              }
                              disabled={!editState.degreeId}
                              testId={createTestId(PAGE, `sel-course-${row.id}`)}
                              onChange={(e) =>
                                setEditState((prev) => ({
                                  ...prev,
                                  courseId: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            <span className="text-text">{row.courseName}</span>
                          )}
                        </td>

                        {/* Semester — editable in edit mode */}
                        <td className="px-4 py-3 min-w-[130px]">
                          {isEditing ? (
                            <Select
                              options={semesters.map((s) => ({
                                label: s.name ?? s.id,
                                value: s.id,
                              }))}
                              value={editState.semId}
                              placeholder="Select semester"
                              testId={createTestId(PAGE, `sel-sem-${row.id}`)}
                              onChange={(e) =>
                                setEditState((prev) => ({
                                  ...prev,
                                  semId: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            <span className="text-text whitespace-nowrap">{row.semName}</span>
                          )}
                        </td>

                        {/* Academic status badge */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${row.academicApproval
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                              }`}
                          >
                            {row.academicApproval ? "Approved" : "Pending"}
                          </span>
                        </td>

                        {/* Actions — edit / save+cancel */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                title="Save changes"
                                data-testid={createTestId(PAGE, `btn-save-${row.id}`)}
                                onClick={() => saveEdit(row.id)}
                                className="inline-flex items-center justify-center text-green-600 transition-colors border border-green-200 rounded-lg h-7 w-7 bg-green-50 hover:bg-green-100"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                title="Discard changes"
                                data-testid={createTestId(PAGE, `btn-cancel-${row.id}`)}
                                onClick={cancelEdit}
                                className="inline-flex items-center justify-center text-gray-400 transition-colors border border-gray-200 rounded-lg h-7 w-7 bg-gray-50 hover:bg-red-50 hover:border-red-200 hover:text-red-500"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <button
                                title="Edit this row"
                                data-testid={createTestId(PAGE, `btn-edit-${row.id}`)}
                                onClick={() => startEdit(row)}
                                className="inline-flex items-center justify-center transition-colors border rounded-lg h-7 w-7 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                              >
                                <Pencil size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* ── Table footer ── */}
          {!loading && filteredRows.length > 0 && (
            <div className="flex flex-col gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-medium text-text">
                  {(page - 1) * ROWS_PER_PAGE + 1}–
                  {Math.min(page * ROWS_PER_PAGE, filteredRows.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-text">{filteredRows.length}</span>{" "}
                student{filteredRows.length !== 1 ? "s" : ""}
                {selectedIds.size > 0 && (
                  <span className="ml-2 font-semibold text-primary">
                    · {selectedIds.size} selected
                  </span>
                )}
              </p>

              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating generate pill — fixed bottom-right, appears when rows selected ── */}
      <div
        className={`fixed bottom-8 right-8 z-30 flex flex-col items-end gap-2 transition-all duration-300 ${selectedIds.size > 0
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-6 pointer-events-none"
          }`}
      >
        {/* Selection counter chip */}
        <div className="flex items-center gap-2 rounded-full bg-white border border-gray-200 shadow-md px-3 py-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
            {selectedIds.size}
          </span>
          <span className="text-xs font-medium text-gray-600">
            student{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            data-testid={createTestId(PAGE, "btn-clear-selection")}
            title="Clear selection"
            className="ml-1 text-gray-300 transition-colors hover:text-red-400"
          >
            <X size={12} />
          </button>
        </div>

        {/* Main generate FAB pill */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          data-testid={createTestId(PAGE, "btn-generate")}
          className="group flex items-center gap-3 rounded-2xl bg-primary px-5 py-3.5 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <span className="w-5 h-5 border-2 rounded-full animate-spin border-white/40 border-t-white" />
              <span className="text-sm font-semibold">Generating…</span>
            </>
          ) : (
            <>
              <span className="flex items-center justify-center transition-colors h-7 w-7 rounded-xl bg-white/20 group-hover:bg-white/30">
                <FileText size={15} />
              </span>
              <span className="text-sm font-semibold tracking-wide">Generate Hall Tickets</span>
            </>
          )}
        </button>
      </div>

      {/* ── Toast — fixed top-right ── */}
      {toast && (
        <div className="fixed z-50 duration-200 top-5 right-5 animate-in fade-in slide-in-from-top-2">
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm min-w-[260px] max-w-xs ${toast.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
              }`}
          >
            <span className={`mt-0.5 shrink-0 rounded-full p-1 ${toast.type === "success" ? "bg-green-100" : "bg-red-100"}`}>
              {toast.type === "success"
                ? <Check size={12} className="text-green-600" />
                : <X size={12} className="text-red-500" />}
            </span>
            <p className="flex-1 text-xs font-medium leading-snug">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className={`shrink-0 transition-colors ${toast.type === "success" ? "text-green-400 hover:text-green-600" : "text-red-400 hover:text-red-600"}`}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}