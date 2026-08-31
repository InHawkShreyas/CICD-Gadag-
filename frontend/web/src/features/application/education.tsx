import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, BookOpen } from "lucide-react";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Toast from "../../components/ui/Toast";
import {
  createEducationDetail,
  getEducationByApplicationId,
  updateEducationDetail
} from "../../services/educationService";
import { getRegistrationByUsername } from "../../services/registrationService";
import {
  getPgEducationByApplicationId,
  savePgTraditionalExam,
  savePgDegreeMarks,
  type PgEducationDetailResponse,
  type PgEntryMode,
  type PgExamLevel, 
} from "../../services/pgEducationService";

// Minimal period payload shape expected from/in pgEducationService APIs.
type PgEducationPeriodPayload = {
  periodType: "sem" | "year";
  periodIndex: number;
  instituteName?: string;
  registrationNumber?: string;
  maxMarks?: number;
  obtainedMarks?: number;
  sgpa?: number;
  percentage?: number;
  cgpa?: number;
};

/* ─── Types ───────────────────────────────────────────────────────────────── */

type LevelData = {
  instituteName: string;
  yearOfPassing: string;
  registrationNumber: string;
  maxMarks: string;
  obtainedMarks: string;
  percentage: string;
  gpa: string;
};

type EducationFormData = Record<string, LevelData>;
type LevelErrors = Partial<Record<keyof LevelData, string>>;
type FormErrors = Record<string, LevelErrors>;
type LevelIds = Record<string, string>;

interface LevelConfig {
  key: string;
  label: string;
  sublabel: string;
  required: boolean;
  note?: string;
}

interface EducationSectionProps {
  applicationId: string;
  appNo?: string;
  onNext: () => void;
  onBack: () => void;
  readOnly?: boolean;
  // categoryId/categoryName intentionally not accepted here anymore —
  // PG eligibility checks no longer factor in category (general threshold only).
}

/* ─── Degree (UG) Marks — for PG applicants ──────────────────────────────── */

type DegreeSemester = {
  maxMarks: string;
  obtainedMarks: string;
  sgpa: string;
  percentage: string;
};

type DegreeEntryMode = "" | "sem" | "year";

type DegreeYear = {
  instituteName: string;
  registrationNumber: string;
  semesters: DegreeSemester[]; // used when entryMode === "sem"; always 2: 1st sem, 2nd sem
  maxMarks: string; // used when entryMode === "year"
  obtainedMarks: string; // used when entryMode === "year"
  percentage: string; // used when entryMode === "year"
  cgpa: string; // used when entryMode === "year"
};

type DegreeMarksData = {
  sameInstitution: "" | "yes" | "no";
  entryMode: DegreeEntryMode;
  yearOfPassing: string; // final year of the UG/Degree — same convention as 10th/12th
  duration: string; // number of years, e.g. "3", "4"
  overallInstituteName: string;
  overallRegistrationNumber: string;
  years: DegreeYear[];
  // ── Eligibility check inputs ──
  // ugSubject/overallPercentage entered here now feed the eligibility filter
  // on the Degree & Course step (which runs AFTER this one). Category is not
  // factored into the eligibility check.
  ugSubject: string; // UG major/optional subject or degree type, e.g. "Economics", "B.Com"
  overallPercentage: string; // entered directly by student for eligibility matching (marks scale varies by CGPA formula, so ask explicitly)
};

const emptyDegreeYear = (): DegreeYear => ({
  instituteName: "",
  registrationNumber: "",
  semesters: [
    { maxMarks: "", obtainedMarks: "", sgpa: "", percentage: "" },
    { maxMarks: "", obtainedMarks: "", sgpa: "", percentage: "" },
  ],
  maxMarks: "",
  obtainedMarks: "",
  percentage: "",
  cgpa: "",
});

const emptyDegreeMarks = (): DegreeMarksData => ({
  sameInstitution: "",
  entryMode: "",
  yearOfPassing: "",
  duration: "",
  overallInstituteName: "",
  overallRegistrationNumber: "",
  years: [],
  ugSubject: "",
  overallPercentage: "",
});

// Traditional level key -> the ExamLevel value the PG backend expects.
// Only 10th/12th/Diploma go through this map — Degree Marks is handled
// separately since it isn't a flat exam row.
const KEY_TO_PG_EXAM_LEVEL: Record<string, PgExamLevel> = {
  tenth: "10th",
  twelfth: "12th",
  diploma: "Diploma",
  sem1: "Sem 1",
  sem2: "Sem 2",
  sem3: "Sem 3",
  sem4: "Sem 4",
  sem5: "Sem 5",
  sem6: "Sem 6",
};

// Builds the period payload sent to POST /api/pg-education/degree-marks
// from the in-memory DegreeMarksData. Mirrors exactly how the UI computes
// globalSemNumber (yIdx * 2 + sIdx) so period_index lines up 1:1 with what
// the student sees on screen.
const buildDegreeMarksPeriods = (data: DegreeMarksData): PgEducationPeriodPayload[] => {
  const sameInstitution = data.sameInstitution === "yes";
  return data.years.flatMap((year, yIdx): PgEducationPeriodPayload[] => {
    if (data.entryMode === "sem") {
      return year.semesters.map((sem, sIdx): PgEducationPeriodPayload => ({
        periodType: "sem",
        periodIndex: yIdx * 2 + sIdx + 1,
        instituteName: sameInstitution ? undefined : year.instituteName || undefined,
        registrationNumber: sameInstitution ? undefined : year.registrationNumber || undefined,
        maxMarks: sem.maxMarks ? Number(sem.maxMarks) : undefined,
        obtainedMarks: sem.obtainedMarks ? Number(sem.obtainedMarks) : undefined,
        sgpa: sem.sgpa ? Number(sem.sgpa) : undefined,
        percentage: sem.percentage ? Number(sem.percentage) : undefined,
      }));
    }
    return [{
      periodType: "year",
      periodIndex: yIdx + 1,
      instituteName: sameInstitution ? undefined : year.instituteName || undefined,
      registrationNumber: sameInstitution ? undefined : year.registrationNumber || undefined,
      maxMarks: year.maxMarks ? Number(year.maxMarks) : undefined,
      obtainedMarks: year.obtainedMarks ? Number(year.obtainedMarks) : undefined,
      percentage: year.percentage ? Number(year.percentage) : undefined,
      cgpa: year.cgpa ? Number(year.cgpa) : undefined,
    }];
  });
};

// Reverse of buildDegreeMarksPeriods — reconstructs DegreeMarksData.years
// from the periods the backend returns. Duration is derived from period
// count (2 periods per year in sem mode, 1 per year in year mode) since
// duration itself is UI-only and never persisted server-side.
const mapPgRecordToDegreeMarks = (record: PgEducationDetailResponse): DegreeMarksData => {
  const entryMode = (record.entryMode as DegreeEntryMode) || "";
  const sameInstitution: "" | "yes" | "no" =
    record.sameInstitution === true ? "yes" : record.sameInstitution === false ? "no" : "";

  const periods = [...record.periods].sort((a, b) => a.periodIndex - b.periodIndex);
  const numYears = entryMode === "sem" ? Math.ceil(periods.length / 2) : periods.length;

  const years: DegreeYear[] = Array.from({ length: numYears }, (_, yIdx) => {
    if (entryMode === "sem") {
      const semA = periods.find((p) => p.periodIndex === yIdx * 2 + 1);
      const semB = periods.find((p) => p.periodIndex === yIdx * 2 + 2);
      return {
        instituteName: semA?.instituteName ?? semB?.instituteName ?? "",
        registrationNumber: semA?.registrationNumber ?? semB?.registrationNumber ?? "",
        semesters: [
          {
            maxMarks: semA?.maxMarks != null ? String(semA.maxMarks) : "",
            obtainedMarks: semA?.obtainedMarks != null ? String(semA.obtainedMarks) : "",
            sgpa: semA?.sgpa != null ? String(semA.sgpa) : "",
            percentage: semA?.percentage != null ? String(semA.percentage) : "",
          },
          {
            maxMarks: semB?.maxMarks != null ? String(semB.maxMarks) : "",
            obtainedMarks: semB?.obtainedMarks != null ? String(semB.obtainedMarks) : "",
            sgpa: semB?.sgpa != null ? String(semB.sgpa) : "",
            percentage: semB?.percentage != null ? String(semB.percentage) : "",
          },
        ],
        maxMarks: "",
        obtainedMarks: "",
        percentage: "",
        cgpa: "",
      };
    }
    const yr = periods.find((p) => p.periodIndex === yIdx + 1);
    return {
      instituteName: yr?.instituteName ?? "",
      registrationNumber: yr?.registrationNumber ?? "",
      semesters: [
        { maxMarks: "", obtainedMarks: "", sgpa: "", percentage: "" },
        { maxMarks: "", obtainedMarks: "", sgpa: "", percentage: "" },
      ],
      maxMarks: yr?.maxMarks != null ? String(yr.maxMarks) : "",
      obtainedMarks: yr?.obtainedMarks != null ? String(yr.obtainedMarks) : "",
      percentage: yr?.percentage != null ? String(yr.percentage) : "",
      cgpa: yr?.cgpa != null ? String(yr.cgpa) : "",
    };
  });

  return {
    sameInstitution,
    entryMode,
    yearOfPassing: record.year != null ? String(record.year) : "",
    duration: numYears ? String(numYears) : "",
    overallInstituteName: sameInstitution === "yes" ? (record.instituteName ?? "") : "",
    overallRegistrationNumber: sameInstitution === "yes" ? (record.registrationNumber ?? "") : "",
    years,
    ugSubject: record.ugSubject ?? "",
    overallPercentage: record.overallPercentage != null ? String(record.overallPercentage) : "",
  };
};

/* ─── PG Eligibility check ────────────────────────────────────────────────── */
// Shared rules, types, and the checkPgEligibility()/findEligibilityRule()
// helpers now live in ../../utils/pgEligibility.ts so degree_course.tsx can
// reuse the exact same logic — see that file for the rule definitions.
// Category is intentionally not passed into the check (general threshold only).

const ORDINAL = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

const DEGREE_LEVEL: LevelConfig = {
  key: "degree",
  label: "Degree Marks",
  sublabel: "UG / Bachelor's Degree",
  required: true,
  note: "Required since you registered for a PG program",
};

/* ─── Constants ───────────────────────────────────────────────────────────── */

const emptyLevel: LevelData = {
  instituteName: "",
  yearOfPassing: "",
  registrationNumber: "",
  maxMarks: "",
  obtainedMarks: "",
  percentage: "",
  gpa: "",
};

const TRADITIONAL_LEVELS: LevelConfig[] = [
  { key: "tenth", label: "10th", sublabel: "SSLC", required: true },
  { key: "twelfth", label: "12th", sublabel: "PUC / HSC", required: false, note: "Required if no Diploma" },
  { key: "diploma", label: "Diploma/ITI/JODC", sublabel: "Polytechnic", required: false, note: "Required if no 12th" },
];

const SEMESTER_LEVELS: LevelConfig[] = [
  { key: "sem1", label: "Sem 1", sublabel: "1st Semester", required: true },
  { key: "sem2", label: "Sem 2", sublabel: "2nd Semester", required: true },
  { key: "sem3", label: "Sem 3", sublabel: "3rd Semester", required: false, note: "Enter details if you have received your semester results" },
  { key: "sem4", label: "Sem 4", sublabel: "4th Semester", required: false, note: "Enter details if you have received your semester results" },
  { key: "sem5", label: "Sem 5", sublabel: "5th Semester", required: false, note: "Enter details if you have received your semester results" },
  { key: "sem6", label: "Sem 6", sublabel: "6th Semester", required: false, note: "Enter details if you have received your semester results" },
];

const EXAM_NAME_MAP: Record<string, string> = {
  "10th": "tenth",
  "12th": "twelfth",
  "Diploma": "diploma",
  "Sem 1": "sem1",
  "Sem 2": "sem2",
  "Sem 3": "sem3",
  "Sem 4": "sem4",
  "Sem 5": "sem5",
  "Sem 6": "sem6",
};

const KEY_TO_EXAM_LABEL: Record<string, string> = {
  tenth: "10th",
  twelfth: "12th",
  diploma: "Diploma",
};

const ALL_LEVEL_KEYS = [
  ...TRADITIONAL_LEVELS.map((l) => l.key),
  ...SEMESTER_LEVELS.map((l) => l.key),
];

const buildEmptyForm = (): EducationFormData =>
  Object.fromEntries(ALL_LEVEL_KEYS.map((k) => [k, { ...emptyLevel }]));

const currentYear = new Date().getFullYear();

const KANNADA_LABELS: Record<string, string> = {
  "Institute Details": "ಸಂಸ್ಥೆಯ ವಿವರಗಳು",
  "Institute Name": "ಸಂಸ್ಥೆಯ ಹೆಸರು",
  "Year of Passing": "ಉತ್ತೀರ್ಣವಾದ ವರ್ಷ",
  "Registration Number": "ನೊಂದಣಿ ಸಂಖ್ಯೆ",
  "Marks & Performance": "ಅಂಕಗಳು ಮತ್ತು ಸಾಧನೆ",
  "Max Marks": "ಗರಿಷ್ಠ ಅಂಕಗಳು",
  "Obtained Marks": "ಪಡೆದ ಅಂಕಗಳು",
  "Percentage (%)": "ಶೇಕಡಾವಾರು (%)",
  "CGPA / GPA": "ಸಿಜಿಪಿಎ / ಜಿಪಿಎ",
  "SGPA": "ಎಸ್‌ಜಿಪಿಎ",
};

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function EducationSection({
  applicationId,
  appNo,
  onNext,
  onBack,
  readOnly = false,
}: EducationSectionProps) {
  const [form, setForm] = useState<EducationFormData>(buildEmptyForm());
  const [levelIds, setLevelIds] = useState<LevelIds>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [activeTab, setActiveTab] = useState<string>("tenth");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [hasUsn, setHasUsn] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Degree type inherited from registration — same convention as
  // degree_course.tsx: if this never came back, registration didn't have a
  // degree type selected, so we block the form entirely (see the guard in
  // the render section below) instead of guessing which table to save to.
  const [regDegreeTypeId, setRegDegreeTypeId] = useState<string>("");

  // ── PG-applicant Degree (UG) marks ──
  const [isPG, setIsPG] = useState(false);
  const [degreeMarks, setDegreeMarks] = useState<DegreeMarksData>(emptyDegreeMarks());
  const [degreeError, setDegreeError] = useState<string>("");

  // Subjects studied in 12th (PUC/HSC) and Diploma — eligibility now weighs
  // subject background over marks. Each saves independently to its own
  // record via savePgTraditionalExam's `ugSubject` field (12th and
  // Diploma are separate rows in pg_education_details) — see performSavePg.
  const [twelfthSubject, setTwelfthSubject] = useState("");
  const [diplomaSubject, setDiplomaSubject] = useState("");

  const LEVELS = hasUsn
    ? SEMESTER_LEVELS
    : isPG
      ? [...TRADITIONAL_LEVELS, DEGREE_LEVEL]
      : TRADITIONAL_LEVELS;

  /* ── Fetch registration to check USN, then load education data ─────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const username = localStorage.getItem("username") ?? "";
        let usnPresent = false;
        let pg = false;

        if (username) {
          try {
            const reg = await getRegistrationByUsername(username);
            usnPresent = !!reg?.usnNo;
            if (usnPresent) {
              setHasUsn(true);
              setActiveTab("sem1");
            }

            if (reg?.degreeTypeId) setRegDegreeTypeId(reg.degreeTypeId);

            if (reg?.degreeTypeName) {
              const s = String(reg.degreeTypeName).toLowerCase();
              pg = s.includes("pg") || s.includes("post");
              setIsPG(pg);
            }
          } catch {
            // no registration record — treat as no USN
          }
        }

        if (pg) {
          // PG applicants: 10th/12th/Diploma AND Degree Marks all live in
          // admission.pg_education_details, not education_details.
          const pgRecords = await getPgEducationByApplicationId(applicationId);
          if (!pgRecords.length) return;

          const ids: LevelIds = {};
          const updatedForm = buildEmptyForm();

          for (const rec of pgRecords) {
            if (rec.examLevel === "Degree Marks") {
              setDegreeMarks(mapPgRecordToDegreeMarks(rec));
              continue;
            }
            const key = EXAM_NAME_MAP[rec.examLevel];
            if (!key) continue;
            ids[key] = rec.id;
            updatedForm[key] = {
              instituteName: rec.instituteName ?? "",
              yearOfPassing: rec.year ? String(rec.year) : "",
              registrationNumber: rec.registrationNumber ?? "",
              maxMarks: rec.maxMarks != null ? String(rec.maxMarks) : "",
              obtainedMarks: rec.obtainedMarks != null ? String(rec.obtainedMarks) : "",
              percentage: rec.percentage != null ? String(rec.percentage) : "",
              gpa: rec.cgpa != null ? String(rec.cgpa) : "",
            };
            // Subjects studied are saved on the 12th/Diploma record itself
            // now, so each tab restores independently.
            if (key === "twelfth") setTwelfthSubject(rec.ugSubject ?? "");
            if (key === "diploma") setDiplomaSubject(rec.ugSubject ?? "");
          }

          setLevelIds(ids);
          setForm(updatedForm);
          return;
        }

        const records = await getEducationByApplicationId(applicationId);
        if (!records.length) return;

        const ids: LevelIds = {};
        const updatedForm = buildEmptyForm();

        for (const rec of records) {
          const [levelLabel, institutionName = ""] = rec.examName.includes("|")
            ? rec.examName.split("|", 2)
            : [rec.examName, ""];

          const key =
            EXAM_NAME_MAP[levelLabel] ??
            (levelLabel.startsWith("Diploma") ? "diploma" : undefined);
          if (!key) continue;
          ids[key] = rec.id ?? "";
          updatedForm[key] = {
            instituteName: institutionName,
            yearOfPassing: rec.year ? String(rec.year) : "",
            registrationNumber: rec.registrationNumber ?? "",
            maxMarks: rec.maxMarks != null ? String(rec.maxMarks) : "",
            obtainedMarks: rec.obtainedMarks != null ? String(rec.obtainedMarks) : "",
            percentage: rec.percentage != null ? String(rec.percentage) : "",
            gpa: rec.cgpa != null ? String(rec.cgpa) : "",
          };
        }

        setLevelIds(ids);
        setForm(updatedForm);
      } catch {
        // start fresh
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [applicationId]);


  /* ── Helpers ────────────────────────────────────────────────────────────── */
  const numericOnly = (v: string) => v.replace(/\D/g, "");
  const decimalOnly = (v: string) => v.replace(/[^0-9.]/g, "");

  const calcPercentage = (obtained: string, max: string): string => {
    const o = Number(obtained);
    const m = Number(max);
    if (!o || !m || m === 0) return "";
    return (Math.round((o / m) * 10000) / 100).toFixed(2);
  };
  const calcGradeFromPercentage = (percentage: string): string => {
    const p = Number(percentage);
    if (!percentage || isNaN(p)) return "";
    const gp = p / 9.5;
    return (gp > 10 ? 10 : gp).toFixed(2);
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const setField = (level: string, field: keyof LevelData, value: string) => {
    setForm((prev) => ({ ...prev, [level]: { ...prev[level], [field]: value } }));
    setErrors((prev) => ({
      ...prev,
      [level]: { ...(prev[level] ?? {}), [field]: "" },
    }));
  };

  const isFilled = (key: string) => key === "degree" ? isDegreeFilled() : !!form[key]?.instituteName;

  /* ── Degree (UG) marks — helpers ──────────────────────────────────────── */
  const handleDurationChange = (value: string) => {
    const cleaned = numericOnly(value).slice(0, 1); // single digit, e.g. 1–9
    const numYears = Math.min(6, Math.max(0, Number(cleaned) || 0));
    setDegreeMarks((prev) => {
      const years = Array.from(
        { length: numYears },
        (_, i) => prev.years[i] ?? emptyDegreeYear()
      );
      return { ...prev, duration: cleaned, years };
    });
    setDegreeError("");
  };

  const setDegreeSameInstitution = (value: "yes" | "no") => {
    setDegreeMarks((prev) => ({ ...prev, sameInstitution: value }));
    setDegreeError("");
  };

  const setDegreeYearOfPassing = (value: string) => {
    setDegreeMarks((prev) => ({ ...prev, yearOfPassing: value }));
    setDegreeError("");
  };


  const setDegreeEntryMode = (value: "sem" | "year") => {
    setDegreeMarks((prev) => {
      // No-op if the mode isn't actually changing — prevents accidental
      // wipes from double-clicks or re-selecting the current mode.
      if (prev.entryMode === value) return prev;

      // Don't clear years' data: DegreeYear already stores sem and year
      // fields independently, and buildDegreeMarksPeriods() only reads
      // the fields relevant to the current entryMode when saving. So
      // switching modes doesn't need to destroy the other mode's data —
      // switching back restores exactly what was there before.
      return { ...prev, entryMode: value };
    });
    setDegreeError("");
  };

  const setDegreeYearPercentage = (yearIdx: number, value: string) => {
    const v = decimalOnly(value);
    setDegreeMarks((prev) => {
      const years = [...prev.years];
      years[yearIdx] = { ...years[yearIdx], percentage: v };
      return { ...prev, years };
    });
    setDegreeError("");
  };


  const setDegreeYearMaxMarks = (yearIdx: number, value: string) => {
    const v = numericOnly(value);
    setDegreeMarks((prev) => {
      const years = [...prev.years];
      const pct = calcPercentage(years[yearIdx].obtainedMarks, v);
      const cgpa = calcGradeFromPercentage(pct);
      years[yearIdx] = { ...years[yearIdx], maxMarks: v, percentage: pct, cgpa };
      return { ...prev, years };
    });
    setDegreeError("");
  };

  const setDegreeYearObtainedMarks = (yearIdx: number, value: string) => {
    const v = numericOnly(value);
    setDegreeMarks((prev) => {
      const years = [...prev.years];
      const pct = calcPercentage(v, years[yearIdx].maxMarks);
      const cgpa = calcGradeFromPercentage(pct);
      years[yearIdx] = { ...years[yearIdx], obtainedMarks: v, percentage: pct, cgpa };
      return { ...prev, years };
    });
    setDegreeError("");
  };

  const setDegreeYearCgpa = (yearIdx: number, value: string) => {
    const v = decimalOnly(value);
    if (v !== "" && !/^(10(\.0{0,2})?|[0-9](\.[0-9]{0,2})?)$/.test(v)) return;
    setDegreeMarks((prev) => {
      const years = [...prev.years];
      years[yearIdx] = { ...years[yearIdx], cgpa: v };
      return { ...prev, years };
    });
    setDegreeError("");
  };

  const setDegreeYearField = (yearIdx: number, field: "instituteName" | "registrationNumber", value: string) => {
    setDegreeMarks((prev) => {
      const years = [...prev.years];
      years[yearIdx] = { ...years[yearIdx], [field]: value };
      return { ...prev, years };
    });
    setDegreeError("");
  };

  const setDegreeSgpa = (yearIdx: number, semIdx: number, value: string) => {
    const v = decimalOnly(value);
    if (v !== "" && !/^(10(\.0{0,2})?|[0-9](\.[0-9]{0,2})?)$/.test(v)) return;
    setDegreeMarks((prev) => {
      const years = [...prev.years];
      const semesters = [...years[yearIdx].semesters];
      semesters[semIdx] = { ...semesters[semIdx], sgpa: v };
      years[yearIdx] = { ...years[yearIdx], semesters };
      return { ...prev, years };
    });
    setDegreeError("");
  };
  const setDegreeSemPercentage = (yearIdx: number, semIdx: number, value: string) => {
    const v = decimalOnly(value);
    setDegreeMarks((prev) => {
      const years = [...prev.years];
      const semesters = [...years[yearIdx].semesters];
      semesters[semIdx] = { ...semesters[semIdx], percentage: v };
      years[yearIdx] = { ...years[yearIdx], semesters };
      return { ...prev, years };
    });
    setDegreeError("");
  };


  const setDegreeSemMaxMarks = (yearIdx: number, semIdx: number, value: string) => {
    const v = numericOnly(value);
    setDegreeMarks((prev) => {
      const years = [...prev.years];
      const semesters = [...years[yearIdx].semesters];
      const pct = calcPercentage(semesters[semIdx].obtainedMarks, v);
      const sgpa = calcGradeFromPercentage(pct);
      semesters[semIdx] = { ...semesters[semIdx], maxMarks: v, percentage: pct, sgpa };
      years[yearIdx] = { ...years[yearIdx], semesters };
      return { ...prev, years };
    });
    setDegreeError("");
  };

  const setDegreeSemObtainedMarks = (yearIdx: number, semIdx: number, value: string) => {
    const v = numericOnly(value);
    setDegreeMarks((prev) => {
      const years = [...prev.years];
      const semesters = [...years[yearIdx].semesters];
      const pct = calcPercentage(v, semesters[semIdx].maxMarks);
      const sgpa = calcGradeFromPercentage(pct);
      semesters[semIdx] = { ...semesters[semIdx], obtainedMarks: v, percentage: pct, sgpa };
      years[yearIdx] = { ...years[yearIdx], semesters };
      return { ...prev, years };
    });
    setDegreeError("");
  };

  // That year's own average of its 2 semester SGPAs — informally "Year SGPA Average".
  // Only meaningful in sem-wise entry mode.
  const yearAverageSgpa = (year: DegreeYear): string => {
    const vals = year.semesters.map((s) => s.sgpa).filter((v) => v !== "" && !isNaN(Number(v))).map(Number);
    if (!vals.length) return "";
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  };

  // Proper CGPA: cumulative average of every completed semester's SGPA up to
  // and including the given year (not just that year's own 2 semesters).
  // Sem-wise mode only.
  const cumulativeCgpaThroughYear = (yearIdx: number): string => {
    const vals = degreeMarks.years
      .slice(0, yearIdx + 1)
      .flatMap((y) => y.semesters.map((s) => s.sgpa))
      .filter((v) => v !== "" && !isNaN(Number(v)))
      .map(Number);
    if (!vals.length) return "";
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  };

  // Year-wise mode: cumulative average of each year's own CGPA, up to and
  // including the given year.
  const cumulativeYearWiseCgpaThroughYear = (yearIdx: number): string => {
    const vals = degreeMarks.years
      .slice(0, yearIdx + 1)
      .map((y) => y.cgpa)
      .filter((v) => v !== "" && !isNaN(Number(v)))
      .map(Number);
    if (!vals.length) return "";
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  };

  // Overall CGPA = cumulative CGPA through the final year, computed according
  // to whichever entry mode the student picked.
  const overallDegreeCgpa = (): string => {
    if (!degreeMarks.years.length) return "";
    return degreeMarks.entryMode === "year"
      ? cumulativeYearWiseCgpaThroughYear(degreeMarks.years.length - 1)
      : cumulativeCgpaThroughYear(degreeMarks.years.length - 1);
  };

  // Returns the specific reasons Degree Marks isn't complete yet, instead of
  // a single boolean — the old blanket "SGPA is required" message was
  // misleading in year-wise mode (and unhelpful generally) because it never
  // said which of the several independent requirements was actually unmet:
  // duration/mode selection, the auto-resolved degree/course
  // (fetched from the Degree & Course step — NOT filled on this page), or
  // the per-year marks themselves.
  const getDegreeMarksMissingFields = (): string[] => {
    const missing: string[] = [];

    if (!degreeMarks.duration || Number(degreeMarks.duration) < 1) missing.push("Course duration");
    if (!degreeMarks.yearOfPassing) {
      missing.push("Year of passing");
    } else {
      const y = Number(degreeMarks.yearOfPassing);
      if (y < 1990 || y > currentYear) missing.push("Year of passing (must be between 1990 and " + currentYear + ")");
    }
    if (degreeMarks.sameInstitution === "") missing.push("Same institution throughout? (Yes/No)");
    if (degreeMarks.entryMode === "") missing.push("Marks entry mode (Semester-wise / Year-wise)");
    if (degreeMarks.years.length === 0) return missing; // nothing further to check until the above are set

    if (degreeMarks.sameInstitution === "yes") {
      if (!degreeMarks.overallInstituteName) missing.push("Institute name");
      if (!degreeMarks.overallRegistrationNumber) missing.push("Registration number");
    }

    // NOTE: Degree/Course selection now happens on the NEXT step
    // (Degree & Course), which uses the ugSubject/overallPercentage entered
    // here to filter which PG programmes the student is shown. So we don't
    // (and can't) require a resolved degree/course selection at this point.

    if (!twelfthSubject && !diplomaSubject && !degreeMarks.ugSubject) missing.push("Subjects studied in 12th/Diploma (or UG subject / degree type)");
    if (!degreeMarks.overallPercentage) missing.push("Overall UG percentage");

    degreeMarks.years.forEach((y, yIdx) => {
      const yearLabel = `Year ${yIdx + 1}`;
      if (degreeMarks.sameInstitution === "no") {
        if (!y.instituteName) missing.push(`${yearLabel} institute name`);
        if (!y.registrationNumber) missing.push(`${yearLabel} registration number`);
      }
      if (degreeMarks.entryMode === "sem") {
        // The very last semester of the course (e.g. Sem 6 for a 3-year
        // degree, Sem 8 for a 4-year degree) is optional — students often
        // haven't received that result yet at application time. This is
        // the last semester of the LAST year, not a hardcoded "sem 6".
        const isLastYear = yIdx === degreeMarks.years.length - 1;
        y.semesters.forEach((s, sIdx) => {
          const isLastSemOfYear = sIdx === y.semesters.length - 1;
          if (isLastYear && isLastSemOfYear) return; // final semester is optional
          if (!s.maxMarks) missing.push(`${yearLabel} Sem ${sIdx + 1} Max Marks`);
          if (!s.obtainedMarks) missing.push(`${yearLabel} Sem ${sIdx + 1} Obtained Marks`);
          if (s.maxMarks && s.obtainedMarks && Number(s.obtainedMarks) > Number(s.maxMarks)) {
            missing.push(`${yearLabel} Sem ${sIdx + 1} Obtained Marks cannot exceed Max Marks`);
          }
          if (!s.sgpa) missing.push(`${yearLabel} Sem ${sIdx + 1} SGPA`);
          if (!s.percentage) missing.push(`${yearLabel} Sem ${sIdx + 1} Percentage`);
        });
      } else if (degreeMarks.entryMode === "year") {
        if (!y.maxMarks) missing.push(`${yearLabel} Max Marks`);
        if (!y.obtainedMarks) missing.push(`${yearLabel} Obtained Marks`);
        if (y.maxMarks && y.obtainedMarks && Number(y.obtainedMarks) > Number(y.maxMarks)) {
          missing.push(`${yearLabel} Obtained Marks cannot exceed Max Marks`);
        }
        if (!y.percentage) missing.push(`${yearLabel} percentage`);
        if (!y.cgpa) missing.push(`${yearLabel} CGPA`);
      }
    });

    return missing;
  };

  const isDegreeFilled = (): boolean => getDegreeMarksMissingFields().length === 0;

  // Shared by validate() (full-form submit) and handleStepNext() (per-tab
  // Next button) so both use identical field-level rules.
  const validateLevel = (data: LevelData): LevelErrors => {
    const e: LevelErrors = {};
    if (!data.instituteName) { e.instituteName = "Required"; }
    if (!data.yearOfPassing) {
      e.yearOfPassing = "Required";
    } else {
      const y = Number(data.yearOfPassing);
      if (y < 1990 || y > currentYear) {
        e.yearOfPassing = `Year must be between 1990–${currentYear}`;
      }
    }

    if (data.gpa) {
      const cgpaRegex = /^(10(\.0{1,2})?|[0-9](\.[0-9]{1,2})?)$/;
      if (!cgpaRegex.test(data.gpa)) {
        e.gpa = "CGPA/GPA must be between 0 and 10";
      }
    }
    if (!data.maxMarks) { e.maxMarks = "Required"; }
    if (!data.obtainedMarks) {
      e.obtainedMarks = "Required";
    } else if (Number(data.obtainedMarks) > Number(data.maxMarks)) {
      e.obtainedMarks = "Cannot exceed max marks";
    }
    if (!data.percentage) { e.percentage = "Required"; }
    return e;
  };

  /* ── Validate ───────────────────────────────────────────────────────────── */
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    let ok = true;

    const markInvalidIfErrors = (key: string, e: LevelErrors) => {
      if (Object.keys(e).length) { newErrors[key] = e; ok = false; }
    };



    if (hasUsn) {
      // sem1 and sem2 are required
      for (const { key, label } of SEMESTER_LEVELS.filter((l) => l.required)) {
        if (!isFilled(key)) {
          newErrors[key] = { instituteName: `${label} is required` };
          ok = false;
        } else {
          markInvalidIfErrors(key, validateLevel(form[key]));
        }
      }
      // sem3 and sem4 are optional — only validate if partially filled
      for (const { key } of SEMESTER_LEVELS.filter((l) => !l.required)) {
        if (isFilled(key)) {
          markInvalidIfErrors(key, validateLevel(form[key]));
        }
      }
    } else {
      // Traditional: require 10th; require at least one of 12th or Diploma
      markInvalidIfErrors("tenth", validateLevel(form["tenth"]));

      const has12th = isFilled("twelfth");
      const hasDiploma = isFilled("diploma");

      if (!has12th && !hasDiploma) {
        newErrors["twelfth"] = { instituteName: "Fill 12th or Diploma — at least one is required" };
        newErrors["diploma"] = { instituteName: "Fill 12th or Diploma — at least one is required" };
        ok = false;
      } else {
        if (has12th) markInvalidIfErrors("twelfth", validateLevel(form["twelfth"]));
        if (hasDiploma) markInvalidIfErrors("diploma", validateLevel(form["diploma"]));
      }

      if (isPG) {
        if (!isDegreeFilled()) {
          const missing = getDegreeMarksMissingFields();
          newErrors["degree"] = { instituteName: "Please complete your UG / Degree marks details" };
          setDegreeError(`Please complete: ${missing.join(", ")}.`);
          ok = false;
        }
      }
    }



    setErrors(newErrors);
    return ok;
  };

  /* ── Save ───────────────────────────────────────────────────────────────── */
  // PG applicants: everything (10th/12th/Diploma + Degree Marks) saves to
  // admission.pg_education_details / pg_education_period via the new
  // endpoints — nothing touches education_details for PG.
  const performSavePg = async () => {
    // hasUsn (existing/lateral-entry) students only ever see the semester
    // tabs (LEVELS = SEMESTER_LEVELS) — they never see Degree Marks. So we
    // must save SEMESTER_LEVELS here, not TRADITIONAL_LEVELS, and we must
    // NOT touch Degree Marks at all for them: degreeMarks.entryMode is
    // still "" since that tab was never rendered/filled, and sending that
    // empty entryMode to savePgDegreeMarks is exactly what caused the
    // backend's "entry mode must be sem or year" error.
    const levelsToSave = hasUsn ? SEMESTER_LEVELS : TRADITIONAL_LEVELS;
    const toSave = levelsToSave.filter((l) => isFilled(l.key) || l.required);

    try {
      setLoading(true);

      for (const l of toSave) {
        await savePgTraditionalExam({
          applicationId,
          appNo,
          examLevel: KEY_TO_PG_EXAM_LEVEL[l.key],
          instituteName: form[l.key].instituteName || undefined,
          registrationNumber: form[l.key].registrationNumber || undefined,
          year: form[l.key].yearOfPassing ? Number(form[l.key].yearOfPassing) : undefined,
          maxMarks: form[l.key].maxMarks ? Number(form[l.key].maxMarks) : undefined,
          obtainedMarks: form[l.key].obtainedMarks ? Number(form[l.key].obtainedMarks) : undefined,
          percentage: form[l.key].percentage ? Number(form[l.key].percentage) : undefined,
          cgpa: form[l.key].gpa ? Number(form[l.key].gpa) : undefined,
          ugSubject:
            l.key === "twelfth" ? (twelfthSubject || undefined)
              : l.key === "diploma" ? (diplomaSubject || undefined)
                : undefined,
        });
      }

      if (!hasUsn) {
        // Degree Marks only applies to fresh PG applicants (the ones who
        // actually filled the Degree Marks tab).
        const sameInstitution = degreeMarks.sameInstitution === "yes";
        await savePgDegreeMarks({
          applicationId,
          appNo,
          sameInstitution,
          entryMode: degreeMarks.entryMode as PgEntryMode,
          year: degreeMarks.yearOfPassing ? Number(degreeMarks.yearOfPassing) : undefined,
          instituteName: sameInstitution ? (degreeMarks.overallInstituteName || undefined) : undefined,
          registrationNumber: sameInstitution ? (degreeMarks.overallRegistrationNumber || undefined) : undefined,
          ugSubject: degreeMarks.ugSubject || undefined,
          overallPercentage: degreeMarks.overallPercentage ? Number(degreeMarks.overallPercentage) : undefined,
          periods: buildDegreeMarksPeriods(degreeMarks),
        });
      }

      onNext();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      showToast(e?.response?.data?.message ?? e?.response?.data?.error ?? e?.message ?? "Save failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const performSave = async () => {
    if (isPG) {
      await performSavePg();
      return;
    }

    const toSave = LEVELS.filter((l) => l.key !== "degree" && (isFilled(l.key) || l.required));

    const payload = toSave.map((l) => ({
      key: l.key,
      data: {
        applicationId,
        appNo,
        examName: `${KEY_TO_EXAM_LABEL[l.key] ?? l.label}|${form[l.key].instituteName}`,
        registrationNumber: form[l.key].registrationNumber || undefined,
        maxMarks: form[l.key].maxMarks ? Number(form[l.key].maxMarks) : undefined,
        obtainedMarks: form[l.key].obtainedMarks ? Number(form[l.key].obtainedMarks) : undefined,
        percentage: form[l.key].percentage ? Number(form[l.key].percentage) : undefined,
        cgpa: form[l.key].gpa ? Number(form[l.key].gpa) : undefined,
        year: form[l.key].yearOfPassing ? Number(form[l.key].yearOfPassing) : undefined,
      },
    }));

    try {
      setLoading(true);
      for (const item of payload) {
        if (levelIds[item.key]) {
          await updateEducationDetail({ id: levelIds[item.key], ...item.data });
        } else {
          await createEducationDetail(item.data);
        }
      }

      onNext();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      showToast(e?.response?.data?.message ?? e?.message ?? "Save failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (readOnly) { onNext(); return; }
    if (!validate()) {
      const firstWithError = LEVELS.find(
        (l) => errors[l.key] && Object.keys(errors[l.key]!).length
      );
      if (firstWithError) setActiveTab(firstWithError.key);
      showToast("Please fix the errors before proceeding.", "error");
      return;
    }
    // For USN students: warn if sem3 or sem4 are empty
    if (hasUsn && !isFilled("sem3") && !isFilled("sem4")) {
      setShowSkipConfirm(true);
      return;
    }
    performSave();
  };

  // Per-tab "Next": moves 10th → 12th → Diploma → Degree Marks (PG) one tab
  // at a time, validating only the tab being left. The actual save + page
  // navigation only happens from the last tab in LEVELS, via handleNext().
  const handleStepNext = () => {
    const stepIdx = LEVELS.findIndex((l) => l.key === activeTab);
    const isFinalStep = stepIdx === LEVELS.length - 1 || stepIdx === -1;

    // Read-only (view-only) mode: just page through the tabs in order so the
    // user can review every level's data. No validation/saving — only jump
    // out to the next application step once they're past the last tab.
    if (readOnly) {
      if (isFinalStep) {
        onNext();
        return;
      }
      setActiveTab(LEVELS[stepIdx + 1].key);
      return;
    }

    if (isFinalStep) {
      handleNext();
      return;
    }

    if (activeTab === "tenth") {
      const e = validateLevel(form.tenth);
      if (Object.keys(e).length) {
        setErrors((prev) => ({ ...prev, tenth: e }));
        showToast("Please fix the errors before proceeding.", "error");
        return;
      }
      setErrors((prev) => ({ ...prev, tenth: {} }));
      setActiveTab("twelfth");
      return;
    }

    if (activeTab === "twelfth") {
      // Optional on its own — only validate if the student actually filled
      // it in. The combined "12th or Diploma" requirement is gated on the
      // Diploma tab below, since that's the last chance before Degree Marks.
      if (isFilled("twelfth")) {
        const e = validateLevel(form.twelfth);
        if (Object.keys(e).length) {
          setErrors((prev) => ({ ...prev, twelfth: e }));
          showToast("Please fix the errors before proceeding.", "error");
          return;
        }
      }
      setErrors((prev) => ({ ...prev, twelfth: {} }));
      setActiveTab("diploma");
      return;
    }

    if (activeTab === "diploma") {
      const has12th = isFilled("twelfth");
      const hasDiploma = isFilled("diploma");

      if (!has12th && !hasDiploma) {
        const msg = { instituteName: "Fill 12th or Diploma — at least one is required" };
        setErrors((prev) => ({ ...prev, twelfth: msg, diploma: msg }));
        showToast("Fill in 12th or Diploma details before proceeding.", "error");
        return;
      }
      if (hasDiploma) {
        const e = validateLevel(form.diploma);
        if (Object.keys(e).length) {
          setErrors((prev) => ({ ...prev, diploma: e }));
          showToast("Please fix the errors before proceeding.", "error");
          return;
        }
      }
      setErrors((prev) => ({ ...prev, diploma: {} }));
      // Only reachable mid-sequence when isPG (diploma isn't the last tab),
      // so the next tab is always Degree Marks here.
      setActiveTab("degree");
      return;
    }

    // hasUsn semester tabs (sem6 is always the final tab, handled above)
    if (activeTab.startsWith("sem")) {
      const semMeta = SEMESTER_LEVELS.find((l) => l.key === activeTab);
      if (semMeta?.required && !isFilled(activeTab)) {
        setErrors((prev) => ({ ...prev, [activeTab]: { instituteName: `${semMeta.label} is required` } }));
        showToast("Please fix the errors before proceeding.", "error");
        return;
      }
      if (isFilled(activeTab)) {
        const e = validateLevel(form[activeTab]);
        if (Object.keys(e).length) {
          setErrors((prev) => ({ ...prev, [activeTab]: e }));
          showToast("Please fix the errors before proceeding.", "error");
          return;
        }
      }
      setErrors((prev) => ({ ...prev, [activeTab]: {} }));
      const nextIdx = SEMESTER_LEVELS.findIndex((l) => l.key === activeTab) + 1;
      if (nextIdx < SEMESTER_LEVELS.length) setActiveTab(SEMESTER_LEVELS[nextIdx].key);
      return;
    }
  };

  const handleStepBack = () => {
    const stepIdx = LEVELS.findIndex((l) => l.key === activeTab);
    const isFirstStep = stepIdx <= 0;

    if (isFirstStep) {
      onBack();
      return;
    }

    const prevLevel = LEVELS[stepIdx - 1];
    setActiveTab(prevLevel.key);
  };

  /* ── UI ─────────────────────────────────────────────────────────────────── */

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        Loading education details...
      </div>
    );
  }

  // No degree type came back from registration at all — same guard as
  // degree_course.tsx. Without it, isPG silently falls back to false and
  // this student's education details would get saved into education_details
  // regardless of what they actually registered for.
  if (!regDegreeTypeId) {
    return (
      <div data-testid="education-section-blocked" className="space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <BookOpen size={16} className="text-primary shrink-0" />
          <h4 className="text-sm font-semibold text-text">
            Education Details <span className="font-normal text-gray-400">(ಶಿಕ್ಷಣ ವಿವರ)</span>
          </h4>
        </div>
        <div className="flex items-start gap-2 p-4 italic font-semibold border text-md rounded-xl text-amber-700 bg-amber-50 border-amber-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Degree type was not selected during registration.</p>
            <p>
              To view the education details form. Please contact the admin for further assistance.
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

  return (
    <div data-testid="education-section" className="space-y-5">
      {toast && (
        <div className="fixed z-50 top-5 right-5">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}

      <div className={`space-y-4 ${readOnly ? "opacity-70 select-none [&_input]:pointer-events-none [&_textarea]:pointer-events-none [&_select]:pointer-events-none" : ""}`}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-gray-100">
          <BookOpen size={16} className="text-primary shrink-0" />
          <h4 className="text-sm font-semibold text-text">
            Education Details{" "}
            <span className="font-normal text-gray-400">(ಶಿಕ್ಷಣ ವಿವರ)</span>
          </h4>
          {hasUsn && (
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium sm:ml-auto">
              Semester-wise (USN enrolled)
            </span>
          )}
        </div>

        {/* ── Tab cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {LEVELS.map(({ key, label, sublabel, required, note }, idx) => {
            const isActive = activeTab === key;
            const hasError = !!(errors[key] && Object.keys(errors[key]!).length > 0);
            const filled = isFilled(key);
            const existing = !!levelIds[key];

            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`
                  relative flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all
                  ${isActive ? "border-primary bg-primary/5 shadow-sm"
                    : hasError ? "border-red-300 bg-red-50"
                      : filled ? "border-green-300 bg-green-50 hover:border-green-400"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}
                `}
              >
                <div className={`
                  flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5
                  ${isActive ? "bg-primary text-white"
                    : hasError ? "bg-red-100 text-red-600"
                      : filled ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"}
                `}>
                  {filled && !isActive ? <CheckCircle size={14} />
                    : hasError && !isActive ? <AlertCircle size={14} />
                      : idx + 1}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={`text-xs font-semibold
                      ${isActive ? "text-primary" : hasError ? "text-red-600" : filled ? "text-green-700" : "text-gray-700"}`}>
                      {label}
                    </span>
                    {required && <span className="text-red-400 text-[10px]">*</span>}
                    {existing && !isActive && (
                      <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded font-medium">saved</span>
                    )}
                  </div>
                  <p className={`text-[10px] mt-0.5 ${isActive ? "text-primary/70" : "text-gray-400"}`}>
                    {sublabel}
                  </p>
                  {note && (
                    <p className={`text-[10px] mt-0.5 ${isActive ? "text-primary/60" : hasError ? "text-red-400" : "text-gray-400"}`}>
                      {note}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Active level form card ──────────────────────────────────────── */}
        {(() => {
          const levelKey = activeTab;
          const d = form[levelKey] ?? emptyLevel;
          const e = errors[levelKey] ?? {};
          const levelMeta = LEVELS.find((l) => l.key === levelKey);
          if (!levelMeta) return null;
          const req = levelMeta.required;
          const isDegreeTab = levelKey === "degree";

          return (
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              {/* Card header */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="min-w-0">
                  <p className="text-sm font-semibold break-words text-text">
                    {levelMeta.label} — {levelMeta.sublabel}
                  </p>
                  {levelMeta.note && (
                    <p className="text-xs text-gray-400 mt-0.5">{levelMeta.note}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!isDegreeTab && levelIds[levelKey] && (
                    <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                      Updating existing record
                    </span>
                  )}
                  {isFilled(levelKey) && (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 border border-green-200 rounded-full bg-green-50">
                      <CheckCircle size={11} /> Filled
                    </span>
                  )}
                </div>
              </div>

              {isDegreeTab ? (
                <div className="p-4 space-y-5">
                  {/* ── PG eligibility is now determined on the NEXT step ──
                      (Degree & Course), which filters the programme list
                      using the UG subject/percentage entered below. ── */}
                  <div className="flex items-start gap-2 px-3 py-2 text-xs font-medium text-blue-700 border border-blue-200 rounded-lg bg-blue-50">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>
                      Enter your UG subject and overall percentage below — on the next step
                      (Degree &amp; Course), you'll see which PG programmes you're eligible to apply for.
                    </span>
                  </div>

                  {degreeError && (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-lg bg-red-50">
                      <AlertCircle size={13} className="shrink-0" /> {degreeError}
                    </div>
                  )}

                  {/* ── Row 1: Year of Passing + Duration + Same institution? ── */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="flex flex-col">
                      <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase min-h-[2.5em]">
                        Year of Passing
                      </p>
                      <Input
                        
                        name="degreeYearOfPassing"
                        value={degreeMarks.yearOfPassing}
                        onChange={(ev) => setDegreeYearOfPassing(numericOnly(ev.target.value).slice(0, 4))}
                        placeholder={`e.g. ${currentYear - 2}`}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase min-h-[2.5em]">
                        Duration of Course (in years)
                      </p>
                      <Input
                        name="duration"
                        value={degreeMarks.duration}
                        onChange={(ev) => handleDurationChange(ev.target.value)}
                        placeholder="e.g. 3"
                      />
                    </div>
                    <div className="flex flex-col">
                      <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase min-h-[2.5em]">
                        Was your UG / Degree completed from the same institution throughout?
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {(["yes", "no"] as const).map((opt) => (
                          <label
                            key={opt}
                            className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold cursor-pointer transition-all
                              ${degreeMarks.sameInstitution === opt
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                          >
                            <input
                              type="radio"
                              name="degreeSameInstitution"
                              className="sr-only"
                              checked={degreeMarks.sameInstitution === opt}
                              onChange={() => setDegreeSameInstitution(opt)}
                            />
                            {opt === "yes" ? "Yes, same institution" : "No, different institutions"}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Row 2: Semester/Year-wise? ── */}
                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                      Does your college report marks Semester-wise or Year-wise?
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {([
                        { value: "sem" as const, label: "Semester-wise (SGPA per semester)" },
                        { value: "year" as const, label: "Year-wise (aggregate per year)" },
                      ]).map((opt) => (
                        <label
                          key={opt.value}
                          className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold cursor-pointer transition-all
                            ${degreeMarks.entryMode === opt.value
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                        >
                          <input
                            type="radio"
                            name="degreeEntryMode"
                            className="sr-only"
                            checked={degreeMarks.entryMode === opt.value}
                            onChange={() => setDegreeEntryMode(opt.value)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* ── Step 5: Overall institute details, if same institution ── */}
                  {degreeMarks.sameInstitution === "yes" && degreeMarks.years.length > 0 && (
                    <div>
                      <p className="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                        Institute Details
                      </p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                          label="Institute Name"
                          name="overallInstituteName"
                          value={degreeMarks.overallInstituteName}
                          onChange={(ev) => setDegreeMarks((prev) => ({ ...prev, overallInstituteName: ev.target.value }))}
                          placeholder="College / University name"
                          required
                        />
                        <Input
                          label="Registration Number"
                          name="overallRegistrationNumber"
                          value={degreeMarks.overallRegistrationNumber}
                          onChange={(ev) => setDegreeMarks((prev) => ({ ...prev, overallRegistrationNumber: ev.target.value }))}
                          placeholder="USN / Reg. no."
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* ── Step 6: PG Eligibility check (UG subject / percentage) ── */}
                  {degreeMarks.years.length > 0 && (
                    <div>
                      <p className="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                        PG Eligibility Check
                      </p>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                          label="UG Subject / Degree Type"
                          name="ugSubject"
                          value={degreeMarks.ugSubject}
                          onChange={(ev) => setDegreeMarks((prev) => ({ ...prev, ugSubject: ev.target.value }))}
                          placeholder="e.g. Economics, B.Com, BCA"
                        />
                        <Input
                          label="Overall UG Percentage"
                          name="overallPercentage"
                          value={degreeMarks.overallPercentage}
                          onChange={(ev) => setDegreeMarks((prev) => ({ ...prev, overallPercentage: decimalOnly(ev.target.value) }))}
                          placeholder="e.g. 62.5"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* ── Step 7: Year-wise / semester-wise marks ── */}
                  {degreeMarks.years.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                        {degreeMarks.entryMode === "year" ? "Year-wise Marks" : "Year-wise Semester Marks"}
                      </p>
                      {degreeMarks.years.map((year, yIdx) => (
                        <div key={yIdx} className="overflow-hidden border border-gray-200 rounded-lg">
                          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-primary/10 text-primary shrink-0">
                                {yIdx + 1}
                              </span>
                              <span className="text-xs font-semibold text-gray-700">
                                {ORDINAL[yIdx] ?? `${yIdx + 1}th`} Year
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px]">
                              {degreeMarks.entryMode === "sem" ? (
                                <>
                                  {yearAverageSgpa(year) && (
                                    <span className="text-gray-500">
                                      Year Avg <span className="font-semibold text-gray-700">{yearAverageSgpa(year)}</span>
                                    </span>
                                  )}
                                  {cumulativeCgpaThroughYear(yIdx) && (
                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                                      CGPA (upto Yr {yIdx + 1}): {cumulativeCgpaThroughYear(yIdx)}
                                    </span>
                                  )}
                                </>
                              ) : (
                                cumulativeYearWiseCgpaThroughYear(yIdx) && (
                                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                                    CGPA (upto Yr {yIdx + 1}): {cumulativeYearWiseCgpaThroughYear(yIdx)}
                                  </span>
                                )
                              )}
                            </div>
                          </div>

                          <div className="p-3 space-y-3">
                            {degreeMarks.sameInstitution === "no" && (
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Input
                                  label="Institute Name"
                                  name={`year${yIdx}InstituteName`}
                                  value={year.instituteName}
                                  onChange={(ev) => setDegreeYearField(yIdx, "instituteName", ev.target.value)}
                                  placeholder="College / University name"
                                  required
                                />
                                <Input
                                  label="Registration Number"
                                  name={`year${yIdx}RegistrationNumber`}
                                  value={year.registrationNumber}
                                  onChange={(ev) => setDegreeYearField(yIdx, "registrationNumber", ev.target.value)}
                                  placeholder="USN / Reg. no."
                                  required
                                />
                              </div>
                            )}

                            {degreeMarks.entryMode === "sem" ? (
                              <div className="space-y-3">
                                {year.semesters.map((sem, sIdx) => {
                                  const globalSemNumber = yIdx * 2 + sIdx; // 0-indexed: Year 1 → 0,1 (Sem 1,2); Year 2 → 2,3 (Sem 3,4); ...
                                  const isLastSem =
                                    yIdx === degreeMarks.years.length - 1 &&
                                    sIdx === year.semesters.length - 1; // last semester of the last year — optional regardless of duration
                                  const semLabel = ORDINAL[globalSemNumber] ?? `${globalSemNumber + 1}th`;
                                  return (
                                    <div key={sIdx} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                      <Input
                                        label={`${semLabel} Sem Max Marks${isLastSem ? " — optional" : ""}`}
                                        name={`year${yIdx}sem${sIdx}MaxMarks`}
                                        value={sem.maxMarks}
                                        onChange={(ev) => setDegreeSemMaxMarks(yIdx, sIdx, ev.target.value)}
                                        placeholder="e.g. 100"
                                        required={!isLastSem}
                                      />
                                      <Input
                                        label={`${semLabel} Sem Obtained Marks${isLastSem ? " — optional" : ""}`}
                                        name={`year${yIdx}sem${sIdx}ObtainedMarks`}
                                        value={sem.obtainedMarks}
                                        onChange={(ev) => setDegreeSemObtainedMarks(yIdx, sIdx, ev.target.value)}
                                        placeholder="e.g. 85"
                                        required={!isLastSem}
                                        error={
                                          sem.maxMarks && sem.obtainedMarks && Number(sem.obtainedMarks) > Number(sem.maxMarks)
                                            ? "Cannot exceed max marks"
                                            : undefined
                                        }
                                      />
                                      <Input
                                        label={`${semLabel} Sem SGPA (${KANNADA_LABELS["SGPA"]})${isLastSem ? " — optional" : ""}`}
                                        name={`year${yIdx}sem${sIdx}Sgpa`}
                                        value={sem.sgpa}
                                        onChange={(ev) => setDegreeSgpa(yIdx, sIdx, ev.target.value)}
                                        placeholder="e.g. 8.5"
                                        required={!isLastSem}
                                      />
                                      <Input
                                        label={`${semLabel} Sem Percentage (%)`}
                                        name={`year${yIdx}sem${sIdx}Percentage`}
                                        value={sem.percentage}
                                        onChange={(ev) => setDegreeSemPercentage(yIdx, sIdx, ev.target.value)}
                                        placeholder="Auto-calculated"
                                        disabled
                                        className="!bg-gray-50 !text-gray-600 cursor-not-allowed"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <Input
                                  label="Max Marks"
                                  name={`year${yIdx}MaxMarks`}
                                  value={year.maxMarks}
                                  onChange={(ev) => setDegreeYearMaxMarks(yIdx, ev.target.value)}
                                  placeholder="e.g. 800"
                                  required
                                />
                                <Input
                                  label="Obtained Marks"
                                  name={`year${yIdx}ObtainedMarks`}
                                  value={year.obtainedMarks}
                                  onChange={(ev) => setDegreeYearObtainedMarks(yIdx, ev.target.value)}
                                  placeholder="e.g. 640"
                                  required
                                    error={
                                      year.maxMarks && year.obtainedMarks && Number(year.obtainedMarks) > Number(year.maxMarks)
                                        ? "Cannot exceed max marks"
                                        : undefined
                                    }
                                />
                                <Input
                                  label={`${ORDINAL[yIdx] ?? `${yIdx + 1}th`} Year Percentage (%)`}
                                  name={`year${yIdx}Percentage`}
                                  value={year.percentage}
                                  onChange={(ev) => setDegreeYearPercentage(yIdx, ev.target.value)}
                                  placeholder="Auto-calculated"
                                  disabled
                                  className="!bg-gray-50 !text-gray-600 cursor-not-allowed"
                                />
                                <Input
                                  label={`${ORDINAL[yIdx] ?? `${yIdx + 1}th`} Year CGPA`}
                                  name={`year${yIdx}Cgpa`}
                                  value={year.cgpa}
                                  onChange={(ev) => setDegreeYearCgpa(yIdx, ev.target.value)}
                                  placeholder="e.g. 7.8"
                                  required
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center justify-between px-3 py-2.5 border rounded-lg bg-primary/5 border-primary/20">
                        <span className="text-xs font-semibold text-gray-500">Overall CGPA (Auto-calculated)</span>
                        <span className="text-sm font-bold text-primary">
                          {overallDegreeCgpa() || "—"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-5">
                  {/* ── Institute Details ── */}
                  <div>
                    <p className="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                      Institute Details
                      <span className="block text-[11px] font-medium normal-case text-gray-500">
                        {KANNADA_LABELS["Institute Details"]}
                      </span>
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Input
                        label={`Institute Name (${KANNADA_LABELS["Institute Name"]})`}
                        name="instituteName"
                        value={d.instituteName}
                        onChange={(ev) => setField(levelKey, "instituteName", ev.target.value)}
                        placeholder="School / College name"
                        error={e.instituteName}
                        required={req}
                      />
                      <Input
                        label={`Year of Passing (${KANNADA_LABELS["Year of Passing"]})`}
                        name="yearOfPassing"
                        value={d.yearOfPassing}
                        onChange={(ev) => setField(levelKey, "yearOfPassing", numericOnly(ev.target.value).slice(0, 4))}
                        placeholder={`e.g. ${currentYear - 2}`}
                        error={e.yearOfPassing}
                        required={req}
                      />
                      <Input
                        label={`Registration Number (${KANNADA_LABELS["Registration Number"]})`}
                        name="registrationNumber"
                        value={d.registrationNumber}
                        onChange={(ev) => setField(levelKey, "registrationNumber", ev.target.value)}
                        placeholder="Hall ticket / Reg. no."
                        required={req}
                      />
                    </div>
                  </div>

                  {/* ── Subjects Studied (12th & Diploma — PG applicants only) ──
                    Drives PG eligibility subject-matching — takes priority
                    over marks, so it's asked right after institute details. ── */}
                  {(levelKey === "twelfth" || levelKey === "diploma") && isPG && (
                    <div>
                      <p className="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                        Subjects Studied
                      </p>
                      <Input
                        label={
                          levelKey === "twelfth"
                            ? "Subjects Studied in 12th (PUC/HSC)"
                            : "Subjects Studied in Diploma"
                        }
                        name={levelKey === "twelfth" ? "twelfthSubject" : "diplomaSubject"}
                        value={levelKey === "twelfth" ? twelfthSubject : diplomaSubject}
                        onChange={(ev) =>
                          levelKey === "twelfth"
                            ? setTwelfthSubject(ev.target.value)
                            : setDiplomaSubject(ev.target.value)
                        }
                        placeholder={
                          levelKey === "twelfth"
                            ? "e.g. Physics, Chemistry, Mathematics, Biology"
                            : "e.g. Computer Science Engineering, Mechanical Engineering"
                        }
                      />
                    </div>
                  )}

                  {/* ── Marks & Performance ── */}
                  <div>
                    <p className="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                      Marks & Performance
                      <span className="block text-[11px] font-medium normal-case text-gray-500">
                        {KANNADA_LABELS["Marks & Performance"]}
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <Input
                        label={`Max Marks (${KANNADA_LABELS["Max Marks"]})`}
                        name="maxMarks"
                        value={d.maxMarks}
                        onChange={(ev) => {
                          const v = numericOnly(ev.target.value);
                          setForm((prev) => ({
                            ...prev,
                            [levelKey]: {
                              ...prev[levelKey],
                              maxMarks: v,
                              percentage: calcPercentage(prev[levelKey].obtainedMarks, v),
                            },
                          }));
                          setErrors((prev) => ({
                            ...prev,
                            [levelKey]: { ...(prev[levelKey] ?? {}), maxMarks: "", percentage: "" },
                          }));
                        }}
                        placeholder="e.g. 600"
                        error={e.maxMarks}
                        required={req}
                      />
                      <Input
                        label={`Obtained Marks (${KANNADA_LABELS["Obtained Marks"]})`}
                        name="obtainedMarks"
                        value={d.obtainedMarks}
                        onChange={(ev) => {
                          const v = numericOnly(ev.target.value);
                          const pct = calcPercentage(v, d.maxMarks);
                          setForm((prev) => ({
                            ...prev,
                            [levelKey]: { ...prev[levelKey], obtainedMarks: v, percentage: pct },
                          }));
                          setErrors((prev) => ({
                            ...prev,
                            [levelKey]: {
                              ...(prev[levelKey] ?? {}),
                              obtainedMarks: d.maxMarks && Number(v) > Number(d.maxMarks) ? "Cannot exceed max marks" : "",
                              percentage: "",
                            },
                          }));
                        }}
                        placeholder="e.g. 520"
                        error={e.obtainedMarks}
                        required={req}
                      />
                      <Input
                        label={`Percentage (%) (${KANNADA_LABELS["Percentage (%)"]})`}
                        name="percentage"
                        value={d.percentage}
                        onChange={() => { }}
                        placeholder="Auto-calculated"
                        error={e.percentage}
                        required={req}
                        disabled
                        className="!bg-gray-50 !text-gray-600 cursor-not-allowed"
                      />
                      <Input
                        label={`CGPA / GPA (${KANNADA_LABELS["CGPA / GPA"]})`}
                        name="gpa"
                        value={d.gpa}
                        onChange={(ev) => {
                          const value = decimalOnly(ev.target.value);

                          if (
                            value === "" ||
                            /^(10(\.0{0,2})?|[0-9](\.[0-9]{0,2})?)$/.test(value)
                          ) {
                            setField(levelKey, "gpa", value);
                          }
                        }} placeholder="e.g. 9.2"
                      />
                    </div>

                    {d.maxMarks && d.obtainedMarks && Number(d.obtainedMarks) <= Number(d.maxMarks) && (
                      <p className="mt-2 text-xs text-gray-400">
                        Score:{" "}
                        <span className="font-medium text-gray-600">
                          {d.obtainedMarks} / {d.maxMarks}
                        </span>
                        {d.percentage && (
                          <> &nbsp;·&nbsp; <span className="font-medium text-primary">{d.percentage}%</span></>
                        )}
                        {d.gpa && (
                          <> &nbsp;·&nbsp; GPA <span className="font-medium text-primary">{d.gpa}</span></>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      </div>{/* end readOnly wrapper */}

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-3 border-t border-gray-100">
        <Button onClick={handleStepBack} variant="outline">
          {LEVELS.findIndex((l) => l.key === activeTab) === 0 ? "← Back" : "← Previous"}
        </Button>
        <Button onClick={handleStepNext} disabled={loading} className="w-32">
          {loading
            ? "Saving..."
            : LEVELS.findIndex((l) => l.key === activeTab) === LEVELS.length - 1
              ? "Proceed →"
              : "Next →"}
        </Button>
      </div>

      {/* ── Skip sem 3 & 4 confirmation ──────────────────────────────────── */}
      {showSkipConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm p-6 space-y-4 bg-white shadow-xl rounded-xl">
            <p className="text-sm font-semibold text-gray-800">
              You have not filled 3rd and 4th semester details. Do you want to skip them?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSkipConfirm(false)}
              >
                Go Back
              </Button>
              <Button
                onClick={() => { setShowSkipConfirm(false); performSave(); }}
                disabled={loading}
              >
                {loading ? "Saving..." : "Yes, Skip"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}