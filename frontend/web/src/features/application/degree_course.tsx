import { useState, useEffect, useMemo } from "react";
import { GraduationCap, Plus, X } from "lucide-react";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import Toast from "../../components/ui/Toast";

import { getDegrees } from "../../services/degreeService";
import type { Degree } from "../../services/degreeService";
import { getCourses, getCoursesByDegree } from "../../services/courseService";
import type { Course } from "../../services/courseService";
import { getLookupsByType } from "../../services/lookupService";
import type { LookupResponse } from "../../services/lookupService";
import {
  createCourseDetail,
  updateCourseDetail,
  createBulkCourseDetail,
  getCourseDetailsByApplicationId,
  deleteCourseDetail,
} from "../../services/applicationCourseDetailService";
import { getRegistrationByUsername } from "../../services/registrationService";
import { checkPgEligibility, PG_ELIGIBILITY_RULES, normalizeProgramName } from "../../services/pgEligibility";
import { getPgEducationByApplicationId } from "../../services/pgEducationService";
import { getFeesByApplicationId } from "../../services/feeCollectionService";
import { getFeeCollectionManualByAppNo } from "../../services/feecollectionmanualService";

/* ─── Props ───────────────────────────────────────────────────────────────── */

interface DegreeCourseSectionProps {
  applicationId: string;
  appNo?: string;
  onNext: () => void;
  onBack: () => void;
  readOnly?: boolean;
  categoryId?: string;
  categoryName?: string;
}

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface Preference {
  degreeId: string;
  courseId: string;
  // The backend row id for this preference, if it was already saved on a
  // previous visit. Undefined for a row the user just added locally and
  // never saved yet — nothing to delete on the server for those.
  id?: string;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

// Same fee-type matching used by useAdmissionLock.ts on the student side.
const ADMISSION_FEE_TYPES = [
  "admission fee",
  "admission fee - installment 1",
  "admission fee - installment 2",
];

/** "today falls within [startDate, endDate]" — inclusive, ignoring time-of-day. */
const isDateWithinRange = (start?: string, end?: string) => {
  if (!start || !end) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);
  return now >= startDate && now <= endDate;
};

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function DegreeCourseSection({
  applicationId,
  appNo,
  onNext,
  onBack,
  readOnly = false,
  categoryId,
  categoryName,
}: DegreeCourseSectionProps) {
  // Master data
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);

  // Single-select mode (default / non-PG registrants)
  const [degreeId, setDegreeId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // PG mode: an ordered list of (degree, course) preferences — Preference 1,
  // Preference 2, ... Each row is saved as its own course-detail record with
  // a "P{n}" preference tag, but sent up together in one bulk save.
  const [preferences, setPreferences] = useState<Preference[]>([{ degreeId: "", courseId: "" }]);

  const [courseDetailId, setCourseDetailId] = useState<string | undefined>();
  const [batchTypeId, setBatchTypeId] = useState<string | undefined>();
  const [, setBatchTypeName] = useState<string>("");

  // Degree type inherited from registration
  const [regDegreeTypeId, setRegDegreeTypeId] = useState<string>("");
  const [regDegreeTypeName, setRegDegreeTypeName] = useState<string>("");
  const [, setLookedUpCategoryLabel] = useState<string>("");

  // Existing/lateral-entry students (identified by USN at registration) never
  // see the Degree Marks tab on the Education step — see education.tsx,
  // which explicitly skips saving Degree Marks for them. So there's no
  // ugSubject/overallPercentage to ever expect for this group, and the
  // "complete your UG degree marks" eligibility gating below doesn't apply.
  const [hasUsn, setHasUsn] = useState(false);

  // UG subject/percentage entered on the Education step's Degree Marks tab
  // (which now runs BEFORE this step) — used to filter the PG degree/course
  // options below down to only what the student is actually eligible for.
  const [ugSubject, setUgSubject] = useState("");
  const [ugOverallPercentage, setUgOverallPercentage] = useState("");

  // UI state
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Once the admission fee is paid, course selection locks permanently —
  // regardless of admin verification status, and regardless of any
  // post-payment edit override granted for the rest of the application.
  // The finalized course/seat should never become editable again once
  // payment has gone through.
  const [courseSelectionLocked, setCourseSelectionLocked] = useState(false);

  useEffect(() => {
    if (!applicationId || !appNo) return;
    const checkFeePaid = async () => {
      try {
        const [feesResult, manualResult] = await Promise.allSettled([
          getFeesByApplicationId(applicationId),
          getFeeCollectionManualByAppNo(appNo),
        ]);

        const onlinePaid =
          feesResult.status === "fulfilled" &&
          feesResult.value.some(
            (f) =>
              (f.status ?? "").toLowerCase() === "success" &&
              ADMISSION_FEE_TYPES.some((t) => (f.feeType ?? "").toLowerCase().includes(t))
          );

        const manualPaid =
          manualResult.status === "fulfilled" &&
          manualResult.value.some((f) => (f.feeName ?? "").toLowerCase().includes("admission fee"));

        setCourseSelectionLocked(onlinePaid || manualPaid);
      } catch {
        setCourseSelectionLocked(false);
      }
    };
    checkFeePaid();
  }, [applicationId, appNo]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Registrants who chose "PG" (or "Post Graduate") at registration time get
  // multi-select Degree/Course pickers — same convention used in education.tsx.
  const isPG = useMemo(() => {
    const s = regDegreeTypeName.toLowerCase();
    return s.includes("pg") || s.includes("post");
  }, [regDegreeTypeName]);

  // Registrants who chose "Certificate Course" / "Certification" get their
  // course detail auto-stamped with the currently active Batch's id.
  const isCertificateCourse = useMemo(
    () => regDegreeTypeName.toLowerCase().includes("certificat"),
    [regDegreeTypeName]
  );

  /* ── Load registration (degree type) ─────────────────────────────────── */
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    if (!username) return;
    getRegistrationByUsername(username)
      .then((reg) => {
        if (reg?.degreeTypeId) setRegDegreeTypeId(reg.degreeTypeId);
        if (reg?.degreeTypeName) setRegDegreeTypeName(reg.degreeTypeName);
        if (reg?.usnNo) setHasUsn(true);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (categoryName || !categoryId) return;
    getLookupsByType("Category", "")
      .then((categoryLookups) => {
        const cat = categoryLookups.find((c) => c.id === categoryId);
        if (cat) setLookedUpCategoryLabel(cat.name ?? cat.code ?? "");
      })
      .catch(() => {
      });
  }, [categoryId, categoryName]);

  /* ── Load master data + existing course detail ───────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const [degreesData, coursesData] = await Promise.all([
          getDegrees(),
          getCourses(),
        ]);
        setDegrees(degreesData);
        setAllCourses(coursesData);

        let courseDetails: Awaited<ReturnType<typeof getCourseDetailsByApplicationId>> = [];
        try {
          courseDetails = await getCourseDetailsByApplicationId(applicationId);
        } catch {
          // No course detail yet — normal for a fresh application.
        }

        if (courseDetails.length) {
          const cd = courseDetails[0];
          setCourseDetailId(cd.id);
          setBatchTypeId((cd as unknown as { batchTypeId?: string }).batchTypeId);

          if (cd.degreeId) {
            setDegreeId(cd.degreeId);
            try {
              const degreeCourses = await getCoursesByDegree(cd.degreeId);
              setCourses(degreeCourses);
            } catch {
              // fall back to filtering allCourses client-side if this fails
              setCourses(coursesData.filter((c) => c.degreeId === cd.degreeId));
            }
          }
          if (cd.courseId) setCourseId(cd.courseId);

          // PG: every saved row is its own (degree, course, preference) —
          // rebuild the ordered preference list from the "P{n}" tag, falling
          // back to arrival order for any legacy rows saved without one.
          const pairedRows = courseDetails.filter((row) => row.degreeId && row.courseId);
          if (pairedRows.length) {
            const sorted = [...pairedRows].sort((a, b) => {
              const pa = (a as unknown as { preference?: string }).preference ?? "";
              const pb = (b as unknown as { preference?: string }).preference ?? "";
              return pa.localeCompare(pb, undefined, { numeric: true });
            });
            setPreferences(
              sorted.map((row) => ({ degreeId: row.degreeId!, courseId: row.courseId!, id: row.id }))
            );
          }
        }
      } catch {
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [applicationId]);

  /* ── Single-select: degree change → reload courses ────────────────────── */
  const handleDegreeChange = async (id: string) => {
    setDegreeId(id);
    setCourseId("");
    setCourses([]);
    setErrors((p) => ({ ...p, degreeId: "", courseId: "" }));
    if (!id) return;
    try {
      setLoadingCourses(true);
      const data = await getCoursesByDegree(id);
      setCourses(data);
      if (data.length === 1) setCourseId(data[0].id);
    } catch (err) {
      console.error("[DegreeCourseSection] getCoursesByDegree failed:", err);
      showToast("Couldn't load courses for this degree. Please try again.", "error");
    } finally {
      setLoadingCourses(false);
    }
  };

  /* ── Load UG Degree Marks (ugSubject/overallPercentage) for PG eligibility filtering ── */
  useEffect(() => {
    if (!isPG) return;
    getPgEducationByApplicationId(applicationId)
      .then((records) => {
        const degreeMarks = records.find((r) => r.examLevel === "Degree Marks");
        const twelfth = records.find((r) => r.examLevel === "12th");
        const diploma = records.find((r) => r.examLevel === "Diploma");

        // Subjects now live on three possible records — 12th, Diploma, and
        // Degree Marks each have their own independent `ugSubject` entry
        // (same column, now present on all three rows). checkPgEligibility
        // only takes one subject string and does substring matching, so
        // combine whatever's been filled in; a match against any of them
        // is enough.
        const combinedSubject = [twelfth?.ugSubject, diploma?.ugSubject, degreeMarks?.ugSubject]
          .filter(Boolean)
          .join(", ");
        if (combinedSubject) setUgSubject(combinedSubject);

        if (degreeMarks) {
          setUgOverallPercentage(
            degreeMarks.overallPercentage != null ? String(degreeMarks.overallPercentage) : ""
          );
        }
      })
      .catch(() => { });
  }, [applicationId, isPG]);

  // Every (degreeName, courseName) pair the student is at least not
  // disqualified for, based on the UG subject/percentage entered on the
  // Education step. "review" (marks criteria met, pending manual checks
  // like PGCET/bridge-course conditions) is kept as a visible option —
  // only a hard "not-eligible" verdict removes it from the picker.
  const eligibleProgramNames = useMemo(() => {
    const map = new Map<string, Set<string>>(); // degreeName(lower) -> Set<courseName(lower)>
    const detailsMap = new Map<string, Set<string>>(); // displayName -> Set<courseName>
    const displayNames: string[] = [];

    if (!isPG || !ugSubject) return { map, displayNames, details: [] as { name: string; courses: string[] }[] };

    for (const rule of PG_ELIGIBILITY_RULES) {
      for (const courseName of rule.courseNames) {
        const result = checkPgEligibility(rule.degreeName, courseName, "", ugOverallPercentage, ugSubject);
        if (result.status === "eligible" || result.status === "review") {
          const key = normalizeProgramName(rule.degreeName);
          if (!map.has(key)) map.set(key, new Set());
          map.get(key)!.add(normalizeProgramName(courseName));

          if (!displayNames.includes(rule.displayName)) displayNames.push(rule.displayName);
          if (!detailsMap.has(rule.displayName)) detailsMap.set(rule.displayName, new Set());
          detailsMap.get(rule.displayName)!.add(courseName);
        }
      }
    }

    const details = displayNames.map((name) => ({
      name,
      courses: Array.from(detailsMap.get(name) ?? []),
    }));

    return { map, displayNames, details };
  }, [isPG, ugSubject, ugOverallPercentage]);

  // Whether we actually have enough data from Education to filter by.
  // USN (existing/lateral-entry) students never fill Degree Marks, so
  // eligibility filtering by UG subject/percentage never applies to them.
  const hasEligibilityData = isPG && !hasUsn && !!ugSubject;

  /* ── PG: courses available for a given preference row's selected degree ──
   * Returns every course under the degree — eligibility is shown as an
   * informational tag on each option (see courseOptionsForPref below), not
   * used to remove options from the list. */
  const getCourseOptionsForDegree = (degreeId: string): Course[] => {
    if (!degreeId) return [];
    return allCourses.filter((c) => c.degreeId === degreeId);
  };

  /** Informational-only eligibility tag for a (degree, course) pair — used
   * to annotate dropdown options, never to remove them. */
  const getEligibilityTag = (degreeName: string, courseName: string): string => {
    if (!hasEligibilityData) return "";
    const result = checkPgEligibility(degreeName, courseName, "", ugOverallPercentage, ugSubject);
    if (result.status === "not-eligible") return " — Not eligible per notice";
    if (result.status === "review") return " — Needs review";
    return "";
  };

  // Keep every preference row in sync as eligibility data / master data
  // arrives (which can happen after mount): auto-pick the course when a
  // degree only has one eligible option, and drop selections that are no
  // longer valid for their row's degree.
  useEffect(() => {
    if (!isPG) return;
    setPreferences((prev) =>
      prev.map((pref) => {
        if (!pref.degreeId) return pref;
        const opts = getCourseOptionsForDegree(pref.degreeId);
        if (opts.length === 1 && !pref.courseId) return { ...pref, courseId: opts[0].id };
        if (pref.courseId && !opts.some((c) => c.id === pref.courseId)) return { ...pref, courseId: "" };
        return pref;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPG, allCourses, degrees]);

  const handlePreferenceDegreeChange = (idx: number, newDegreeId: string) => {
    const opts = getCourseOptionsForDegree(newDegreeId);
    setPreferences((prev) => {
      const next = [...prev];
      next[idx] = {
        degreeId: newDegreeId,
        courseId: opts.length === 1 ? opts[0].id : "",
      };
      return next;
    });
    setErrors((p) => ({ ...p, [`degree_${idx}`]: "", [`course_${idx}`]: "" }));
  };

  const handlePreferenceCourseChange = (idx: number, newCourseId: string) => {
    setPreferences((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], courseId: newCourseId };
      return next;
    });
    setErrors((p) => ({ ...p, [`course_${idx}`]: "" }));
  };

  const addPreference = () => {
    setPreferences((prev) => [...prev, { degreeId: "", courseId: "" }]);
  };

  const removePreference = async (idx: number) => {
    const target = preferences[idx];

    // Remove from local state right away so the UI feels instant.
    setPreferences((prev) => prev.filter((_, i) => i !== idx));
    setErrors((p) => {
      const next = { ...p };
      delete next[`degree_${idx}`];
      delete next[`course_${idx}`];
      return next;
    });

    // Only saved rows (ones that came back from the backend with an id)
    // need a server-side delete — a row the user just added and never
    // saved has nothing to remove there.
    if (!target?.id) return;

    try {
      await deleteCourseDetail(target.id);
    } catch (err) {
      console.error("[DegreeCourseSection] deleteCourseDetail failed:", err);
      showToast("Couldn't remove that preference. Please try again.", "error");
      // Put it back in local state since the server-side delete failed.
      setPreferences((prev) => {
        const next = [...prev];
        next.splice(idx, 0, target);
        return next;
      });
    }
  };

  /* ── Resolve the active Batch for Certificate Course registrants ──────── */
  const resolveBatchType = async (): Promise<LookupResponse | undefined> => {
    if (!isCertificateCourse) return undefined;
    try {
      const batches: LookupResponse[] = await getLookupsByType("Batch", "");
      return batches.find((b) =>
        isDateWithinRange(
          (b as unknown as { startDate?: string }).startDate,
          (b as unknown as { endDate?: string }).endDate
        )
      );
    } catch (err) {
      console.error("[DegreeCourseSection] getLookupsByType(\"Batch\") failed:", err);
      return undefined;
    }
  };

  useEffect(() => {
    if (!isCertificateCourse) {
      setBatchTypeId(undefined);
      setBatchTypeName("");
      return;
    }
    resolveBatchType().then((batch) => {
      setBatchTypeId(batch?.id);
      setBatchTypeName(batch?.name ?? "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCertificateCourse]);

  /* ── Validate ──────────────────────────────────────────────────────────── */
  const validate = (resolvedBatchTypeId?: string) => {
    const e: Record<string, string> = {};
    if (isPG) {
      preferences.forEach((pref, idx) => {
        if (!pref.degreeId) e[`degree_${idx}`] = "Please select a degree";
        if (!pref.courseId) e[`course_${idx}`] = "Please select a course";
      });
    } else {
      if (!degreeId) e.degreeId = "Please select a degree";
      if (!courseId) e.courseId = "Please select a course";
    }
    const effectiveBatchTypeId = resolvedBatchTypeId ?? batchTypeId;
    if (isCertificateCourse && !effectiveBatchTypeId) {
      e.batchTypeId = "No active batch is available for today's date. Please contact the admissions office.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Save ──────────────────────────────────────────────────────────────── */
  const handleNext = async () => {
    if (readOnly || courseSelectionLocked) { onNext(); return; }

    try {
      setLoading(true);

      const resolvedBatch = isCertificateCourse ? await resolveBatchType() : undefined;
      const resolvedBatchTypeId = resolvedBatch?.id;
      if (isCertificateCourse) {
        setBatchTypeId(resolvedBatch?.id);
        setBatchTypeName(resolvedBatch?.name ?? "");
      }

      if (!validate(resolvedBatchTypeId)) {
        showToast("Please fix the errors before proceeding.", "error");
        setLoading(false);
        return;
      }

      if (isPG) {
        const selections = preferences
          .map((pref, idx) => ({
            degreeId: pref.degreeId,
            courseId: pref.courseId,
            preference: `P${idx + 1}`,
          }))
          .filter((s) => s.degreeId && s.courseId);

        await createBulkCourseDetail({
          applicationId,
          applicationNo: appNo,
          selections,
        });

        onNext();
        return;
      }

      const effectiveBatchTypeId = isCertificateCourse
        ? (resolvedBatchTypeId ?? batchTypeId)
        : undefined;

      const cdPayload = {
        applicationId,
        applicationNo: appNo,
        degreeId,
        courseId,
        batchTypeId: effectiveBatchTypeId,
      };

      if (courseDetailId) {
        await updateCourseDetail({ id: courseDetailId, ...cdPayload });
      } else {
        await createCourseDetail(cdPayload);
      }

      onNext();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      showToast(e?.response?.data?.message ?? e?.message ?? "Save failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── UI ─────────────────────────────────────────────────────────────────── */
  if (fetching) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        Loading...
      </div>
    );
  }

  // No degree type came back from registration at all — nothing to filter
  // degrees/courses against, so don't render the pickers. Point the
  // applicant to admissions support instead of asking them to self-report
  // any identity document over an unspecified channel.
  if (!regDegreeTypeId) {
    return (
      <div data-testid="degree-course-section-blocked" className="space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <GraduationCap size={16} className="text-primary shrink-0" />
          <h4 className="text-sm font-semibold text-text">
            Degree &amp; Course <span className="font-normal text-gray-400">(ಪದವಿ ಮತ್ತು ಕೋರ್ಸ್)</span>
          </h4>
        </div>
        <div className="flex items-start gap-2 p-4 italic font-semibold border text-md rounded-xl text-amber-700 bg-amber-50 border-amber-200">
          <GraduationCap size={16} className="mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Degree type was not selected during registration.</p>
            <p>
              To view the available degree and course options, you need to register again. Please contact the admin for further assistance.
            </p>
          </div>
        </div>
        <div className="flex justify-between pt-3 border-t border-gray-100">
          <Button onClick={onBack} variant="outline">
            ← Back
          </Button>
          <Button disabled className="w-32">
            Next →
          </Button>
        </div>
      </div>
    );
  }

  const degreesForRegisteredType = regDegreeTypeId
    ? degrees.filter((d) => (d as unknown as { degreeTypeId?: string }).degreeTypeId === regDegreeTypeId)
    : degrees;

  const visibleDegrees = degreesForRegisteredType.length ? degreesForRegisteredType : degrees;

  // NOTE: eligibility is informational only (see the green banner + the
  // per-course tag below) — it no longer restricts which degrees/courses a
  // PG registrant can pick from. Every degree for the registered type is
  // shown regardless of the UG subject/percentage entered on Education.
  const pgEligibleDegrees = visibleDegrees;

  const degreeOptions = visibleDegrees.map((d) => ({ label: d.degreeName, value: d.id }));
  const courseOptions = courses.map((c) => ({
    label: `${c.name}${c.code ? ` (${c.code})` : ""}`,
    value: c.id,
  }));

  const pgDegreeOptions = pgEligibleDegrees.map((d) => ({ label: d.degreeName, value: d.id }));

  return (
    <div data-testid="degree-course-section" className="space-y-6">
      {toast && (
        <div className="fixed z-50 top-5 right-5">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}

      {courseSelectionLocked && (
        <div className="flex items-start gap-2 px-3 py-2.5 text-xs border rounded-lg text-amber-700 bg-amber-50 border-amber-200">
          <GraduationCap size={14} className="mt-0.5 shrink-0" />
          <span>
            Your admission fee has been paid — your degree/course selection is now locked and
            cannot be changed.
          </span>
        </div>
      )}

      <div className={`space-y-5 ${(readOnly || courseSelectionLocked) ? "pointer-events-none opacity-70 select-none" : ""}`}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <GraduationCap size={16} className="text-primary shrink-0" />
          <h4 className="text-sm font-semibold text-text">
            Degree &amp; Course <span className="font-normal text-gray-400">(ಪದವಿ ಮತ್ತು ಕೋರ್ಸ್)</span>
          </h4>
        </div>

        {/* ── Degree & Course ──────────────────────────────────────────────── */}
        <section className="border border-gray-200 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-200 rounded-t-xl bg-gray-50">
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Programme Selection
            </p>
          </div>
          <div className="p-4 space-y-4">
            {regDegreeTypeName && (
              <div className="flex items-start gap-2 px-3 py-2 text-xs border rounded-lg text-primary bg-primary/5 border-primary/20">
                <GraduationCap size={14} className="mt-0.5 shrink-0" />
                <span>
                  During registration you selected{" "}
                  <span className="font-semibold">{regDegreeTypeName}</span> — showing degree
                  courses related to that programme type only.
                  {isPG && " You can add more than one degree/course as ranked preferences."}
                </span>
              </div>
            )}
            {errors.batchTypeId && (
              <p className="text-xs text-red-500">{errors.batchTypeId}</p>
            )}

            {isPG ? (
              <div className="space-y-3">
                {hasEligibilityData ? (
                  <div className="flex items-start gap-2 px-3 py-2.5 text-xs border rounded-lg text-emerald-700 bg-emerald-50 border-emerald-200">
                    <GraduationCap size={14} className="mt-0.5 shrink-0" />
                    <div className="space-y-1.5 w-full">
                      <p>
                        Based on the degree you've completed ({ugSubject}
                        {ugOverallPercentage ? `, ${ugOverallPercentage}% aggregate` : ""}),
                        you're eligible to apply for:
                      </p>
                      {eligibleProgramNames.details.length ? (
                        <ul className="pl-4 space-y-1 list-disc marker:text-emerald-400">
                          {eligibleProgramNames.details.map((d) => (
                            <li key={d.name}>
                              <span className="font-semibold">{d.name}</span>
                              {d.courses.length > 0 && (
                                <span className="text-emerald-600"> — {d.courses.join(", ")}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="italic text-emerald-700/80">
                          None of the currently listed PG programmes.
                        </p>
                      )}
                      <p className="text-emerald-600/80">
                        This is for your reference only — every degree/course is still listed below,
                        with a note on any that don't currently match your entered subject/marks.
                      </p>
                    </div>
                  </div>
                ) : !hasUsn ? (
                  <div className="flex items-start gap-2 px-3 py-2 text-xs border rounded-lg text-amber-700 bg-amber-50 border-amber-200">
                    <GraduationCap size={14} className="mt-0.5 shrink-0" />
                    <span>
                      Complete your UG degree marks and subject on the Education step to see which
                      PG programmes you're eligible for.
                    </span>
                  </div>
                ) : null}
                <div className="space-y-3">
                  {preferences.map((pref, idx) => {
                    const otherCourseIds = preferences
                      .filter((_, i) => i !== idx)
                      .map((p) => p.courseId)
                      .filter(Boolean);

                    const degreeOptionsForPref = pgDegreeOptions;
                    const prefDegree = degrees.find((d) => d.id === pref.degreeId);
                    const courseOptionsForPref = getCourseOptionsForDegree(pref.degreeId)
                      .filter((c) => c.id === pref.courseId || !otherCourseIds.includes(c.id))
                      .map((c) => ({
                        label: `${c.name}${c.code ? ` (${c.code})` : ""}${prefDegree ? getEligibilityTag(prefDegree.degreeName, c.name) : ""
                          }`,
                        value: c.id,
                      }));

                    return (
                      <div key={idx} className="relative p-3 border border-gray-200 rounded-lg bg-gray-50/60">
                        {preferences.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePreference(idx)}
                            title="Remove preference"
                            className="absolute flex items-center justify-center w-6 h-6 text-gray-400 rounded-full top-2 right-2 hover:bg-red-50 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <p className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                          {preferences.length > 1 ? `Preference ${idx + 1}` : "Preference"}
                        </p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Select
                            label="Degree/Certification Course (ಪದವಿ/ಪ್ರಮಾಣೀಕರಣ ಕೋರ್ಸ್)"
                            name={`degree_${idx}`}
                            options={degreeOptionsForPref}
                            value={pref.degreeId}
                            onChange={(e) => handlePreferenceDegreeChange(idx, e.target.value)}
                            placeholder="Select Degree"
                            error={errors[`degree_${idx}`]}
                            required
                            disabled={pgEligibleDegrees.length === 0}
                          />
                          <Select
                            label="Course (ಕೋರ್ಸ್)"
                            name={`course_${idx}`}
                            options={courseOptionsForPref}
                            value={pref.courseId}
                            onChange={(e) => handlePreferenceCourseChange(idx, e.target.value)}
                            placeholder={pref.degreeId ? "Select Course" : "Select a degree first"}
                            error={errors[`course_${idx}`]}
                            required
                            disabled={!pref.degreeId}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button type="button" onClick={addPreference} variant="outline" className="gap-1.5">
                  <Plus size={14} /> Add Preference
                </Button>
              </div>

            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Degree/Certification Courses (ಪದವಿ/ಪ್ರಮಾಣೀಕರಣ ಕೋರ್ಸ್‌ಗಳು)"
                  name="degree"
                  options={degreeOptions}
                  value={degreeId}
                  onChange={(e) => handleDegreeChange(e.target.value)}
                  placeholder="Select Degree"
                  error={errors.degreeId}
                  required
                  disabled={visibleDegrees.length === 0}
                />
                {courses.length === 1 ? (
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-text">
                      Course (ಕೋರ್ಸ್) <span className="text-red-500">*</span>
                    </label>
                    <div className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {courses[0].name}{courses[0].code ? ` (${courses[0].code})` : ""}
                    </div>
                  </div>
                ) : (
                  <Select
                    label="Course (ಕೋರ್ಸ್)"
                    name="course"
                    options={courseOptions}
                    value={courseId}
                    onChange={(e) => {
                      setCourseId(e.target.value);
                      setErrors((p) => ({ ...p, courseId: "" }));
                    }}
                    placeholder={loadingCourses ? "Loading courses..." : degreeId ? "Select Course" : "Select a degree first"}
                    error={errors.courseId}
                    required
                    disabled={!degreeId || loadingCourses}
                  />
                )}
              </div>
            )}
          </div>
        </section>

      </div>{/* end readOnly wrapper */}

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-3 border-t border-gray-100">
        <Button onClick={onBack} variant="outline">
          ← Back
        </Button>
        <Button onClick={handleNext} disabled={loading} className="w-32">
          {loading ? "Saving..." : "Next →"}
        </Button>
      </div>
    </div>
  );
}