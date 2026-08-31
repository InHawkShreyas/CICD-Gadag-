import type { LookupResponse } from "./lookupService";

/* ─── Types ───────────────────────────────────────────────────────────────── */

export type ApplicantDocumentContext = {
  nationalityCode: string;
  isKarnataka: boolean;
  isNonGmCategory: boolean;
  selectedSeatTypeNames: string[];
  has12th: boolean;
  hasDiploma: boolean;
};

export type ResolvedDocument = {
  id: string;
  documentName: string;
  triggerRule: string;
  triggerLabel: string;
};

/* ─── Config ──────────────────────────────────────────────────────────────── */

// Study Certificate is generated internally, never a student upload.
export const EXCLUDED_DOCUMENTS = new Set(["Study Certificate"]);

// Document name the (student-combined) PG degree (UG) marks PDF is uploaded under.
export const DEGREE_MARKS_DOC_NAME = "Degree Marks Card";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

export function toDocumentTriggerLabel(type2: string): string {
  if (type2 === "ALWAYS")           return "Always required";
  if (type2 === "OPTIONAL_12TH")    return "Required — you filled 12th / II PUC education";
  if (type2 === "OPTIONAL_DIPLOMA") return "Required — you filled Diploma education";
  if (type2 === "INDIAN")           return "Required for Indian nationals";
  if (type2 === "NON_INDIAN")       return "Required for non-Indian nationals";
  if (type2 === "CATEGORY_NON_GM")  return "Required for reserved category applicants";
  if (type2.startsWith("SEAT_")) {
    const name = type2.replace("SEAT_", "").replace(/_/g, " ");
    return `Required for ${name} seat type`;
  }
  return "";
}

export function isDocumentApplicable(type2: string, ctx: ApplicantDocumentContext): boolean {
  switch (type2) {
    case "ALWAYS":           return true;
    case "OPTIONAL_12TH":    return ctx.has12th;
    case "OPTIONAL_DIPLOMA": return ctx.hasDiploma;
    case "INDIAN":           return ctx.nationalityCode === "001";
    case "NON_INDIAN":       return ctx.nationalityCode === "002";
    case "CATEGORY_NON_GM":  return ctx.nationalityCode === "001" && ctx.isKarnataka && ctx.isNonGmCategory;
    default: {
      if (type2.startsWith("SEAT_")) {
        const seatKey = type2.replace("SEAT_", "").replace(/_/g, " ").toLowerCase();
        return ctx.selectedSeatTypeNames.some((s) => s.trim().toLowerCase() === seatKey);
      }
      return false;
    }
  }
}

export function resolveRequiredDocuments(
  lookups: LookupResponse[],
  ctx: ApplicantDocumentContext
): ResolvedDocument[] {
  return lookups
    .filter((l) => !!l.type2)
    .filter((l) => !EXCLUDED_DOCUMENTS.has(l.name ?? ""))
    .filter((l) => isDocumentApplicable(l.type2 ?? "", ctx))
    .map((l) => ({
      id:           l.id,
      documentName: l.name ?? "",
      triggerRule:  l.type2 ?? "",
      triggerLabel: toDocumentTriggerLabel(l.type2 ?? ""),
    }));
}