import eligibilityData from "../data/pg_eligibility_criteria.json";

/* ─── Types ───────────────────────────────────────────────────────────────── */

export type EligibilityRule = {
  degreeName: string; 
  courseNames: string[];  
  displayName: string;    
  minPercentageGeneral: number | null;
  minPercentageReserved: number | null;
  reservedCategories: string[];
  requiresSubjectMatch: boolean;
  acceptedSubjects: string[] | null;
  acceptedDegreeTypes: string[] | null;
  preferenceOrder: string[] | null;
  notes: string;
};

export type EligibilityCategory = "" | "General" | "SC" | "ST" | "Cat-I" | "DA" | "2A" | "2B" | "3A" | "3B";

export type EligibilityStatus = "eligible" | "not-eligible" | "review" | "unknown";

export type EligibilityResult = { status: EligibilityStatus; message: string };

/* ─── Data ────────────────────────────────────────────────────────────────── */

export const PG_ELIGIBILITY_RULES: EligibilityRule[] =
  (eligibilityData as { programs: EligibilityRule[] }).programs;

export const CATEGORY_OPTIONS: EligibilityCategory[] = ["General", "SC", "ST", "Cat-I", "DA", "2A", "2B", "3A", "3B"];

/* ─── Subject / degree alias expansion ──────────────────────────────────────
 * checkPgEligibility's subject-match step used to do a plain substring check
 * against whatever free text the student (or the 12th/Diploma/Degree forms)
 * had on file — e.g. "PCMB" or "B.Sc." — against literal rule keywords like
 * "Chemistry" or "Science". A student who studied Chemistry via a "PCMB"
 * combo, or holds a "B.Sc. Food Processing" degree, never has the literal
 * word "chemistry" or "science" in their record, so they were wrongly
 * marked not-eligible and dropped from the course dropdown.
 *
 * ALIAS_MAP expands common abbreviations/combos into the full-word subjects
 * or degree-type keywords they imply, so matching works against what the
 * abbreviation actually means, not just its literal characters.
 * Extend this map as more PUC combos / degree abbreviations come up. ─────── */
export const ALIAS_MAP: Record<string, string[]> = {
  // Science PUC (10+2) combinations
  pcmb: ["physics", "chemistry", "mathematics", "biology", "science"],
  pcmc: ["physics", "chemistry", "mathematics", "computer science", "science"],
  pcms: ["physics", "chemistry", "mathematics", "statistics", "science"],
  pcb: ["physics", "chemistry", "biology", "science"],
  pcm: ["physics", "chemistry", "mathematics", "science"],
  cbz: ["chemistry", "botany", "zoology", "biology", "science"],
  cebs: ["chemistry", "electronics", "biology", "science"],

  // Commerce PUC combinations
  ceba: ["commerce", "economics", "business studies", "accountancy"],
  cebm: ["commerce", "economics", "business studies", "mathematics"],
  hebs: ["history", "economics", "business studies"],

  // Degree-type abbreviations -> broad category used in acceptedDegreeTypes
  "b sc": ["science"],
  bsc: ["science"],
  "b com": ["commerce"],
  bcom: ["commerce"],
  "b e": ["engineering"],
  be: ["engineering"],
  "b tech": ["engineering"],
  btech: ["engineering"],
  "b f sc": ["farm science", "science"],
  bfsc: ["farm science", "science"],
  "b sc ag": ["farm science", "science"],
  "b arch": ["engineering"],

  // Subject spelling/punctuation variants
  biochemistry: ["bio-chemistry", "chemistry"],
};

/** Lowercase, strip punctuation (periods/hyphens/underscores), collapse
 * whitespace — so "B.Sc.", "B-Sc", "bio-chemistry" and "Biochemistry" all
 * normalize to a comparable form before alias lookup / substring matching. */
export const normalizeForMatch = (raw: string): string =>
  (raw ?? "")
    .toLowerCase()
    .replace(/[.\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Expands a free-text subject/degree string (e.g. "PCMB, B.Sc. Food
 * Processing") into a superset of normalized text plus every alias-implied
 * keyword found within it, so e.g. "pcmb" also yields "chemistry" and
 * "science" for downstream substring matching. */
export const expandSubjectAliases = (raw: string): string => {
  const normalized = normalizeForMatch(raw);
  if (!normalized) return "";
  const parts = [normalized];
  for (const [alias, expansions] of Object.entries(ALIAS_MAP)) {
    // word-boundary check so "be" doesn't fire inside "chemistry" etc.
    const pattern = new RegExp(`(^|[\\s,])${alias}([\\s,]|$)`);
    if (pattern.test(normalized)) parts.push(...expansions);
  }
  return parts.join(" ");
};

export const normalizeProgramName = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'") 
    .replace(/[\u201c\u201d]/g, '"')  
    .replace(/[\u2013\u2014]/g, "-")  
    .replace(/\s*\/\s*/g, "/")     
    .replace(/\s+/g, " ");     

export const findEligibilityRule = (degreeName: string, courseName: string): EligibilityRule | undefined => {
  const d = normalizeProgramName(degreeName);
  const c = normalizeProgramName(courseName);
  return PG_ELIGIBILITY_RULES.find(
    (rule) =>
      normalizeProgramName(rule.degreeName) === d &&
      rule.courseNames.some((cn) => normalizeProgramName(cn) === c)
  );
};

export const normalizeCategoryLabel = (raw: string): EligibilityCategory => {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s.includes("general") || s === "gm") return "General";
  if (s === "sc" || s.includes("scheduled caste")) return "SC";
  if (s === "st" || s.includes("scheduled tribe")) return "ST";
  if (s.replace(/[\s-]/g, "").match(/^cat(egory)?i$/) || s.includes("category-1") || s.includes("category 1")) return "Cat-I";
  if (s === "da" || s.includes("differently")) return "DA";

  const compact = s.replace(/[^a-z0-9]/g, "");
  if (compact === "iiia" || compact === "3a") return "3A";
  if (compact === "iiib" || compact === "3b") return "3B";
  if (compact === "iia" || compact === "2a") return "2A";
  if (compact === "iib" || compact === "2b") return "2B";

  return ""; // e.g. 1G — genuinely not covered by this notice; general threshold applies but display stays untouched
};

export const checkPgEligibility = (
  degreeName: string,
  courseName: string,
  category: EligibilityCategory,
  overallPercentage: string,
  ugSubject: string
): EligibilityResult => {
  if (!degreeName || !courseName) {
    return { status: "unknown", message: "Select a PG degree and course to check eligibility." };
  }

  const rule = findEligibilityRule(degreeName, courseName);
  if (!rule) {
    return {
      status: "not-eligible",
      message: `"${degreeName} — ${courseName}" is not part of this university's listed PG eligibility criteria (2026-27). You are not eligible to apply for this course under the current notice — please confirm with the admissions office.`,
    };
  }

  if (rule.requiresSubjectMatch) {
    if (!ugSubject) {
      return { status: "unknown", message: "Enter your UG subject / degree type to confirm subject-based eligibility." };
    }
    const expandedSubject = expandSubjectAliases(ugSubject);
    const accepted = (rule.acceptedSubjects ?? []).map((s) => normalizeForMatch(s));
    const acceptedDegrees = (rule.acceptedDegreeTypes ?? []).map((s) => normalizeForMatch(s));
    const matched =
      accepted.some((s) => expandedSubject.includes(s)) ||
      acceptedDegrees.some((s) => expandedSubject.includes(s));
    if (!matched) {
      const required = [...(rule.acceptedSubjects ?? []), ...(rule.acceptedDegreeTypes ?? [])].join(", ");
      return { status: "not-eligible", message: `${rule.displayName} requires a background in: ${required}.` };
    }
  }

  if (rule.minPercentageGeneral == null) {
    return { status: "review", message: rule.notes };
  }

  const marksNote = buildMarksNote(rule, category, overallPercentage);

  if (rule.preferenceOrder?.length) {
    return {
      status: "review",
      message: `Admission follows order of preference: ${rule.preferenceOrder.join(" → ")}${marksNote}`,
    };
  }

  return {
    status: "eligible",
    message: (rule.notes || `Meets the eligibility criteria for ${rule.displayName}.`) + marksNote,
  };
};

const buildMarksNote = (
  rule: EligibilityRule,
  category: EligibilityCategory,
  overallPercentage: string
): string => {
  if (rule.minPercentageGeneral == null) return "";
  const { minRequired } = minPercentageHint(rule, category);
  if (minRequired == null) return "";

  if (!overallPercentage || isNaN(Number(overallPercentage))) {
    return ` Note: the notice states a minimum of ${minRequired}% for your category — enter your UG percentage to confirm against this.`;
  }

  const marks = Number(overallPercentage);
  if (marks < minRequired) {
    return ` Note: minimum ${minRequired}% is required per the notice — your entered ${marks}% is below this; please verify eligibility with the admissions office.`;
  }

  return "";
};

export const minPercentageHint = (
  rule: EligibilityRule,
  category: EligibilityCategory
): { minRequired: number | null } => {
  if (rule.minPercentageGeneral == null) return { minRequired: null };
  const isReserved = category !== "" && category !== "General" && rule.reservedCategories.includes(category);
  return { minRequired: (isReserved ? rule.minPercentageReserved : rule.minPercentageGeneral) ?? rule.minPercentageGeneral };
};