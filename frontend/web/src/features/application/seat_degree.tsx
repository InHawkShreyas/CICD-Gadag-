import { useState, useEffect, useMemo } from "react";
import { GraduationCap, Download } from "lucide-react";
import { downloadMyApplicationPdf } from "../../services/reportService";
import Select from "../../components/ui/Select";
import Input from "../../components/ui/Input";
import Radio from "../../components/ui/Radio";
import Button from "../../components/ui/Button";
import Toast from "../../components/ui/Toast";

import { getLookupsByType } from "../../services/lookupService";
import type { LookupResponse } from "../../services/lookupService";
import {
  updateCourseDetail,
  getCourseDetailsByApplicationId,
} from "../../services/applicationCourseDetailService";
import {
  createSeatType,
  deleteSeatType,
  getSeatTypesByApplicationId,
} from "../../services/seatTypeService";
import type { SeatTypeDto } from "../../services/seatTypeService";
import { useNavigate } from "react-router-dom";
import { getRegistrationByUsername } from "../../services/registrationService";
import { getAcademicYears } from "../../services/academicYearService";
import type { AcademicYear } from "../../services/academicYearService";


/* ─── Props ───────────────────────────────────────────────────────────────── */

interface SeatDegreeSectionProps {
  applicationId: string;
  appNo?: string;
  onNext: () => void;
  onBack: () => void;
  readOnly?: boolean;
}

/* ─── Kannada name map ────────────────────────────────────────────────────── */

const KANNADA_NAMES: Record<string, string> = {
  "Rural Candidate": "ಗ್ರಾಮೀಣ ಅಭ್ಯರ್ಥಿ",
  "Kannada Medium": "ಕನ್ನಡ ಮಾಧ್ಯಮ",
  "Hyderabad Karnataka": "ಹೈದರಾಬಾದ್ ಕರ್ನಾಟಕ",
  "Differently Able": "ವಿಶೇಷಚೇತನರು",
  "Supernumerary": "ಅಧಿಸಂಖ್ಯಾ",
  "NSS": "ರಾಷ್ಟ್ರೀಯ ಸೇವಾ ಯೋಜನೆ",
  "NCC": "ರಾಷ್ಟ್ರೀಯ ಕೆಡೆಟ್ ಕಾರ್ಪ್ಸ್",
  "Sports": "ಕ್ರೀಡೆ",
  "Cultural": "ಸಾಂಸ್ಕೃತಿಕ",
  "Jammu and Kashmir": "ಜಮ್ಮು ಮತ್ತು ಕಾಶ್ಮೀರ",
  "Defence": "ರಕ್ಷಣಾ",
  "Transgender": "ತೃತೀಯ ಲಿಂಗ",
  "Kashmiri Migrant": "ಕಾಶ್ಮೀರಿ ವಲಸಿಗ",
  "Foreign National": "ವಿದೇಶಿ ನಾಗರಿಕ",
  "Outside Karnataka": "ಕರ್ನಾಟಕ ಹೊರಗಿನ",
  "Not Applicable": "ಅನ್ವಯಿಸುವುದಿಲ್ಲ",
  "In-Service": "ಸೇವಾ ನಿರತ",
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

// Normalizes a lookup name for comparison — strips spaces/hyphens and
// lowercases, so "In-Service", "In Service", "Inservice" all match.
const normalizeSeatName = (name?: string | null): string =>
  (name ?? "").toLowerCase().replace(/[\s-]/g, "");

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function SeatDegreeSection({
  applicationId,
  appNo,
  onNext,
  onBack,
  readOnly = false,
}: SeatDegreeSectionProps) {
  const navigate = useNavigate();
  // Seat types
  const [mainSeats, setMainSeats] = useState<LookupResponse[]>([]);
  const [superSeats, setSuperSeats] = useState<LookupResponse[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [savedSeatTypes, setSavedSeatTypes] = useState<SeatTypeDto[]>([]);

  // Facilities
  const [hostel, setHostel] = useState("");   // "true" | "false"
  const [transport, setTransport] = useState("");

  // Previous registration number
  const [prevRegNo, setPrevRegNo] = useState("");

  // Batch (academic year)
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [batchId, setBatchId] = useState("");

  // Existing course detail id(s) (for PUT) — degree/course themselves are
  // set on the earlier "Degree & Course" step; we keep them here only so
  // the update payload doesn't wipe out what was already saved there.
  // PG applicants can have MULTIPLE course_detail rows (one per ranked
  // preference), so we track every row, not just the first — see handleNext.
  const [courseDetailRows, setCourseDetailRows] = useState<
    { id: string; degreeId?: string; courseId?: string }[]
  >([]);

  const [hasUsn, setHasUsn] = useState(false);

  // Degree type inherited from registration — same convention as
  // degree_course.tsx: registrants who chose "PG" (or "Post Graduate") at
  // registration time get the "Inservice" option in the Main Quota.
  const [regDegreeTypeName, setRegDegreeTypeName] = useState<string>("");
  const isPG = useMemo(() => {
    const s = regDegreeTypeName.toLowerCase();
    return s.includes("pg") || s.includes("post");
  }, [regDegreeTypeName]);

  // In-service candidate details — someone currently employed while
  // applying (e.g. a working teacher). "Inservice" is just another
  // SeatType lookup entry (checked/unchecked via checkedIds, same as
  // every other seat checkbox) — not a separate Yes/No lookup.
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [dateOfJoin, setDateOfJoin] = useState("");
  const [serviceYears, setServiceYears] = useState("");

  // UI state
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Is "Supernumerary" checked?
  const supernumeraryLookup = mainSeats.find((s) => s.name === "Supernumerary");
  const showSuper = supernumeraryLookup ? checkedIds.has(supernumeraryLookup.id) : false;

  // "Not Applicable" seat — mutually exclusive with all others
  const naLookup = mainSeats.find((s) => s.name === "Not Applicable");
  const naSelected = naLookup ? checkedIds.has(naLookup.id) : false;

  // "Inservice" — a SeatType lookup entry like any other seat checkbox,
  // not a separate Yes/No lookup. Checking it reveals the employer fields.
  const inserviceLookup = [...mainSeats, ...superSeats].find(
    (s) => normalizeSeatName(s.name) === "inservice"
  );
  const isInservice = inserviceLookup ? checkedIds.has(inserviceLookup.id) : false;

  /* ── Check USN / degree type (for PG → Inservice gating) ───────────────── */
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    if (!username) return;
    getRegistrationByUsername(username)
      .then((reg) => {
        if (reg?.usnNo) setHasUsn(true);
        if (reg?.degreeTypeName) setRegDegreeTypeName(reg.degreeTypeName);
      })
      .catch(() => { });
  }, []);

  /* ── Load lookup data on mount ─────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const [seatTypes, courseDetails, existingSeatTypes, years] =
          await Promise.all([
            getLookupsByType("SeatType"),
            getCourseDetailsByApplicationId(applicationId),
            getSeatTypesByApplicationId(applicationId),
            getAcademicYears(),
          ]);
        setAcademicYears(years);

        setMainSeats(seatTypes.filter((s) => s.type2 === "MAIN"));
        setSuperSeats(seatTypes.filter((s) => s.type2 === "SUPERNUMERARY"));
        setSavedSeatTypes(existingSeatTypes);

        // Pre-fill saved seat type checkboxes
        if (existingSeatTypes.length) {
          setCheckedIds(new Set(existingSeatTypes.map((s) => s.seatTypeId)));
        }

        // Pre-fill course detail — capture every row (PG applicants have one
        // per ranked preference), but shared fields (hostel/transport/etc.)
        // only need to be read from one, since they're application-level.
        if (courseDetails.length) {
          setCourseDetailRows(
            courseDetails
              .filter((row): row is typeof row & { id: string } => !!row.id)
              .map((row) => ({
                id: row.id,
                degreeId: row.degreeId,
                courseId: row.courseId,
              }))
          );
          // Facility/in-service/batch fields are application-level and should
          // be identical across every preference row — but GetByApplicationIdAsync
          // returns no guaranteed order, and older records may only have these
          // populated on one specific row (not necessarily index 0). Pick the
          // first row that actually has data, falling back to index 0 so a
          // brand-new application with nothing saved yet still works.
          const cd =
            courseDetails.find(
              (c) =>
                c.hostelFacilityYn != null ||
                c.transportFacilityYn != null ||
                !!c.previousRegistrationNo ||
                !!c.batchId ||
                !!c.department
            ) ?? courseDetails[0];
          setHostel(cd.hostelFacilityYn === true ? "true" : cd.hostelFacilityYn === false ? "false" : "");
          setTransport(cd.transportFacilityYn === true ? "true" : cd.transportFacilityYn === false ? "false" : "");
          setPrevRegNo(cd.previousRegistrationNo ?? "");
          setBatchId(cd.batchId ?? "");
          setDepartment(cd.department ?? "");
          setDesignation(cd.designation ?? "");
          setOfficeAddress(cd.officeAddress ?? "");
          setDateOfJoin(cd.dateOfJoin ? cd.dateOfJoin.split("T")[0] : "");
          setServiceYears(cd.serviceYears != null ? String(cd.serviceYears) : "");
        }
      } catch {
        // start fresh
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [applicationId]);

  /* ── Toggle seat type checkbox ─────────────────────────────────────────── */
  const toggleSeat = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      const isNA = naLookup?.id === id;
      if (next.has(id)) {
        next.delete(id);
      } else if (isNA) {
        // Selecting NA clears everything else
        next.clear();
        next.add(id);
      } else {
        // Selecting any other seat removes NA
        if (naLookup) next.delete(naLookup.id);
        next.add(id);
      }
      return next;
    });
    setErrors((p) => ({ ...p, seatTypes: "" }));
  };

  /* ── Validate ──────────────────────────────────────────────────────────── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!hasUsn && checkedIds.size === 0) e.seatTypes = "Please select at least one seat type";
    if (!hostel) e.hostel = "Please select";
    if (!transport) e.transport = "Please select";
    if (hasUsn && !prevRegNo.trim()) e.prevRegNo = "Previous registration number is required";
    if (isPG && isInservice) {
      if (!department) e.department = "Required";
      if (!designation) e.designation = "Required";
      if (!officeAddress) e.officeAddress = "Required";
      if (!dateOfJoin) e.dateOfJoin = "Required";
      if (!serviceYears) e.serviceYears = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Save ──────────────────────────────────────────────────────────────── */
  const handleNext = async () => {
    if (readOnly) { onNext(); return; }
    if (!validate()) {
      showToast("Please fix the errors before proceeding.", "error");
      return;
    }

    try {
      setLoading(true);

      // ── Course detail: PUT (degree/course were already created on the
      // "Degree & Course" step; here we only add hostel/transport/etc.) ──
      // PG applicants have one course_detail row per ranked preference — all
      // of them share the same hostel/transport/in-service answers, so every
      // row must be updated, not just the first, or the later preferences
      // are left with null facility values forever.
      if (courseDetailRows.length) {
        for (const row of courseDetailRows) {
          if (!row.degreeId || !row.courseId) {
            showToast("Degree/Course details are missing. Please go back and complete the Degree & Course step.", "error");
            setLoading(false);
            return;
          }
          await updateCourseDetail({
            id: row.id,
            applicationId,
            applicationNo: appNo,
            degreeId: row.degreeId,
            courseId: row.courseId,
            hostelFacilityYn: hostel === "true",
            transportFacilityYn: transport === "true",
            inserviceYn: isInservice,
            previousRegistrationNo: hasUsn ? (prevRegNo.trim() || undefined) : undefined,
            batchId: hasUsn ? (batchId || undefined) : undefined,
            department: isInservice ? department : undefined,
            designation: isInservice ? designation : undefined,
            officeAddress: isInservice ? officeAddress : undefined,
            dateOfJoin: isInservice ? dateOfJoin : undefined,
            serviceYears: isInservice && serviceYears ? Number(serviceYears) : undefined,
          });
        }
      }

      // ── Seat types: full block skipped for USN-enrolled students, since
      // they don't see the Seat Type section at all — but PG in-service
      // status still needs recording as a SeatType row like everyone else. ──
      if (!hasUsn) {
        const savedMap = new Map(savedSeatTypes.map((s) => [s.seatTypeId, s]));

        for (const [seatTypeId, saved] of savedMap.entries()) {
          if (!checkedIds.has(seatTypeId) && saved.id) {
            await deleteSeatType(saved.id);
          }
        }

        for (const seatTypeId of checkedIds) {
          if (!savedMap.has(seatTypeId)) {
            const lookup = [...mainSeats, ...superSeats].find((s) => s.id === seatTypeId);
            await createSeatType({
              applicationId,
              applicationNo: appNo,
              seatTypeId,
              seatTypeName: lookup?.name ?? "",
            });
          }
        }
      } else if (isPG && inserviceLookup) {
        const savedInservice = savedSeatTypes.find((s) => s.seatTypeId === inserviceLookup.id);
        if (isInservice && !savedInservice) {
          await createSeatType({
            applicationId,
            applicationNo: appNo,
            seatTypeId: inserviceLookup.id,
            seatTypeName: inserviceLookup.name ?? "",
          });
        } else if (!isInservice && savedInservice?.id) {
          await deleteSeatType(savedInservice.id);
        }
      }

      navigate("/student/photos");
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

  return (
    <div data-testid="seat-degree-section" className="space-y-6">
      {toast && (
        <div className="fixed z-50 top-5 right-5">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}

      <div className={`space-y-5 ${readOnly ? "pointer-events-none opacity-70 select-none" : ""}`}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <GraduationCap size={16} className="text-primary shrink-0" />
          <h4 className="text-sm font-semibold text-text">
            Seat &amp; Degree <span className="font-normal text-gray-400">(ಸೀಟು ಮತ್ತು ಪದವಿ)</span>
          </h4>
        </div>

        {/* ── USN / previous registration ─────────────────────────────────── */}
        {hasUsn && (
          <section className="overflow-hidden border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Previous Registration
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Previous Registration No. (ಹಿಂದಿನ ನೋಂದಣಿ ಸಂಖ್ಯೆ)"
                  name="prevRegNo"
                  value={prevRegNo}
                  onChange={(e) => {
                    setPrevRegNo(e.target.value);
                    setErrors((p) => ({ ...p, prevRegNo: "" }));
                  }}
                  placeholder="Enter previous registration number"
                  error={errors.prevRegNo}
                  required
                />
                <div>
                  <Select
                    label="Year of Admission (ದಾಖಲಾತಿ ವರ್ಷ)"
                    name="batchId"
                    options={academicYears.map((y) => ({
                      label: y.description ?? y.id,
                      value: y.id,
                    }))}
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    placeholder="Select Year of Admission when you joined the first year of your current degree"
                  />
                  {batchId && (() => {
                    const desc = academicYears.find((y) => y.id === batchId)?.description ?? "";
                    const label =
                      desc.includes("2025-2026") ? "Taking admission for 2nd year" :
                        desc.includes("2024-2025") ? "Taking admission for 3rd year" :
                          desc.includes("2023-2024") ? "Taking admission for 4th year" :
                            null;
                    return label ? (
                      <p className="mt-1.5 text-xs font-semibold text-primary">{label}</p>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Seat Types — hidden for USN-enrolled students ────────────────── */}
        {!hasUsn && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                Seat Type <span className="font-normal text-gray-300 normal-case">(Select all that apply)</span>
              </p>
              {checkedIds.size > 0 && (
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                  {checkedIds.size} selected
                </span>
              )}
            </div>

            {/* MAIN seat types */}
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                <p className="text-xs font-semibold text-gray-600">Main Quota</p>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                {mainSeats
                  .filter((seat) => {
                    // "Inservice" is only offered in the Main Quota to
                    // registrants who selected "PG" at registration time.
                    const isInserviceSeat = normalizeSeatName(seat.name) === "inservice";
                    return !isInserviceSeat || isPG;
                  })
                  .map((seat) => {
                  const checked = checkedIds.has(seat.id);
                  const isNaSeat = naLookup?.id === seat.id;
                  const disabled = naSelected && !isNaSeat;
                  return (
                    <label
                      key={seat.id}
                      className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all
                      ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                      ${checked
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleSeat(seat.id)}
                        className="w-4 h-4 cursor-pointer accent-primary shrink-0"
                      />
                      <span className="text-xs font-medium leading-tight">
                        {seat.name}
                        {KANNADA_NAMES[seat.name ?? ""] && (
                          <span className="block text-[10px] font-normal opacity-70">
                            {KANNADA_NAMES[seat.name ?? ""]}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* SUPERNUMERARY seat types — shown only when Supernumerary is checked */}
            {showSuper && (
              <div className="overflow-hidden border rounded-xl border-amber-200">
                <div className="px-4 py-2 border-b bg-amber-50 border-amber-200">
                  <p className="text-xs font-semibold text-amber-700">
                    Supernumerary Quota
                    <span className="ml-1 font-normal text-amber-500">(Select applicable)</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                  {superSeats.map((seat) => {
                    const checked = checkedIds.has(seat.id);
                    return (
                      <label
                        key={seat.id}
                        className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all
                        ${checked
                            ? "border-amber-500 bg-amber-50 text-amber-700"
                            : "border-gray-200 hover:border-amber-200 hover:bg-amber-50/50 text-gray-700"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSeat(seat.id)}
                          className="w-4 h-4 cursor-pointer accent-amber-500 shrink-0"
                        />
                        <span className="text-xs font-medium leading-tight">
                          {seat.name}
                          {KANNADA_NAMES[seat.name ?? ""] && (
                            <span className="block text-[10px] font-normal opacity-70">
                              {KANNADA_NAMES[seat.name ?? ""]}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {errors.seatTypes && (
              <p className="text-xs text-red-500">{errors.seatTypes}</p>
            )}
          </section>
        )}

        {/* ── Facilities ───────────────────────────────────────────────────── */}
        <section className="overflow-hidden border border-gray-200 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Facilities Required
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2">
            <div>
              <Radio
                label="Hostel Facility (ವಸತಿ ಸೌಲಭ್ಯ)"
                name="hostel"
                options={[
                  { label: "Yes (ಹೌದು)", value: "true" },
                  { label: "No (ಇಲ್ಲ)", value: "false" },
                ]}
                value={hostel}
                onChange={(v) => {
                  setHostel(String(v));
                  setErrors((p) => ({ ...p, hostel: "" }));
                }}
                required
              />
              {errors.hostel && <p className="mt-1 text-xs text-red-500">{errors.hostel}</p>}
            </div>
            <div>
              <Radio
                label="Transport Facility (ಸಾರಿಗೆ)"
                name="transport"
                options={[
                  { label: "Yes (ಹೌದು)", value: "true" },
                  { label: "No (ಇಲ್ಲ)", value: "false" },
                ]}
                value={transport}
                onChange={(v) => {
                  setTransport(String(v));
                  setErrors((p) => ({ ...p, transport: "" }));
                }}
                required
              />
              {errors.transport && <p className="mt-1 text-xs text-red-500">{errors.transport}</p>}
            </div>
          </div>
        </section>

        {/* ── In-service candidate details — shown for every PG registrant,
             whether or not they're a USN/existing student. Existing students
             skip the Seat Type section entirely (and so never see the
             "Inservice" checkbox in the Main Quota grid), so they get a
             standalone toggle here instead. ─────────────────────────────── */}
        {isPG && (hasUsn || isInservice) && (
          <section className="border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-200 rounded-t-xl bg-gray-50">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                In-Service Candidate Details
              </p>
            </div>
            <div className="p-4 space-y-4">
              {hasUsn && !inserviceLookup && (
                <p className="text-xs text-gray-400">
                  "Inservice" isn't configured as a seat type yet — contact the admissions office if this applies to you.
                </p>
              )}

              {hasUsn && inserviceLookup && (
                <label
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all
                  ${isInservice
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"}`}
                >
                  <input
                    type="checkbox"
                    checked={isInservice}
                    onChange={() => toggleSeat(inserviceLookup.id)}
                    className="w-4 h-4 cursor-pointer accent-primary shrink-0"
                  />
                  <span className="text-sm font-medium">
                    I am currently in-service (working)
                    <span className="block text-xs font-normal opacity-70">
                      {KANNADA_NAMES["In-Service"]}
                    </span>
                  </span>
                </label>
              )}

              {isInservice && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Department"
                    name="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    error={errors.department}
                    required
                  />
                  <Input
                    label="Designation"
                    name="designation"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    error={errors.designation}
                    required
                  />
                  <Input
                    label="Office Address"
                    name="officeAddress"
                    value={officeAddress}
                    onChange={(e) => setOfficeAddress(e.target.value)}
                    error={errors.officeAddress}
                    required
                  />
                  <Input
                    label="Date of Joining"
                    name="dateOfJoin"
                    type="date"
                    value={dateOfJoin}
                    onChange={(e) => setDateOfJoin(e.target.value)}
                    error={errors.dateOfJoin}
                    required
                  />
                  <Input
                    label="Years of Service"
                    name="serviceYears"
                    value={serviceYears}
                    onChange={(e) => setServiceYears(e.target.value.replace(/[^0-9]/g, ""))}
                    error={errors.serviceYears}
                    required
                  />
                </div>
              )}
            </div>
          </section>
        )}

      </div>{/* end readOnly wrapper */}

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-3 border-t border-gray-100">
        <Button onClick={onBack} variant="outline">
          ← Back
        </Button>
        <div className="flex gap-2">
          {appNo && (
            <Button
              onClick={() => downloadMyApplicationPdf()}
              variant="outline"
            >
              <Download size={15} />
              Download Application
            </Button>
          )}
          <Button onClick={handleNext} disabled={loading} className="w-32">
            {loading ? "Saving..." : "Next →"}
          </Button>
        </div>
      </div>
    </div>
  );
}