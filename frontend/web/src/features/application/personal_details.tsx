import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Radio from "../../components/ui/Radio";
import Button from "../../components/ui/Button";
import Toast from "../../components/ui/Toast";
import { getLookupsByType } from "../../services/lookupService";
import type { LookupResponse } from "../../services/lookupService";
import { getAcademicYears } from "../../services/academicYearService";
import {
  createApplication,
  updateApplication,
} from "../../services/applicationService";
import { getRegistrationByUsername } from "../../services/registrationService";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type PersonalDetailsData = {
  // Basic
  academicYearId: string;
  fullName: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;

  // Nationality
  nationality: string;

  // Indian
  aadharNumber: string;
  karnatakaYn: string; // "true" | "false"
  homeState: string;   // when not from Karnataka
  religion: string;
  category: string;
  caste: string;
  annualIncome: string;
  rdNumber: string;
  casteRdNumber: string;

  // Non-Indian
  passportNumber: string;
  visaNumber: string;
  passportExpiry: string;
  visaExpiry: string;

  // Parents & Guardian
  fatherName: string;
  fatherOccupation: string;
  fatherMobile: string;
  motherName: string;
  motherOccupation: string;
  motherMobile: string;
  guardianName: string;
  guardianMobile: string;

  // IDs
  satsId: string;
  apaarId: string;

  // Permanent Address
  permanentAddressLine1: string;
  permanentAddressLine2: string;
  permanentCity: string;
  permanentState: string;
  permanentCountry: string;
  permanentPostalCode: string;

  // Current Address
  sameAsPermanent: boolean;
  presentAddressLine1: string;
  presentAddressLine2: string;
  presentCity: string;
  presentState: string;
  presentCountry: string;
  presentPostalCode: string;
};

const defaultPersonalDetails: PersonalDetailsData = {
  academicYearId: "",
  fullName: "",
  phone: "",
  email: "",
  dob: "",
  gender: "",
  nationality: "",
  aadharNumber: "",
  karnatakaYn: "",
  homeState: "",
  religion: "",
  category: "",
  caste: "",
  annualIncome: "",
  rdNumber: "",
  casteRdNumber: "",
  passportNumber: "",
  visaNumber: "",
  passportExpiry: "",
  visaExpiry: "",
  fatherName: "",
  fatherOccupation: "",
  fatherMobile: "",
  motherName: "",
  motherOccupation: "",
  motherMobile: "",
  guardianName: "",
  guardianMobile: "",
  satsId: "",
  apaarId: "",
  permanentAddressLine1: "",
  permanentAddressLine2: "",
  permanentCity: "",
  permanentState: "",
  permanentCountry: "",
  permanentPostalCode: "",
  sameAsPermanent: false,
  presentAddressLine1: "",
  presentAddressLine2: "",
  presentCity: "",
  presentState: "",
  presentCountry: "",
  presentPostalCode: "",
};

/* ─── Props ───────────────────────────────────────────────────────────────── */

interface PersonalDetailsSectionProps {
  applicationId?: string;
  appNo?: string;
  initialData?: Partial<PersonalDetailsData>;
  onNext: (applicationId: string) => void;
  readOnly?: boolean;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */


const numericOnly = (value: string) => value.replace(/\D/g, "");

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function PersonalDetailsSection({
  applicationId,
  appNo,
  initialData,
  onNext,
  readOnly = false,
}: PersonalDetailsSectionProps) {
  const [form, setForm] = useState<PersonalDetailsData>({
    ...defaultPersonalDetails,
    ...initialData,
  });
  useEffect(() => {
    if (initialData?.fullName && Object.keys(initialData).length > 0) {
      setForm((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const [errors, setErrors] = useState<Partial<Record<keyof PersonalDetailsData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [hasUsn, setHasUsn] = useState(false);

  // Lookup options
  const [nationalityOptions, setNationalityOptions] = useState<{ label: string; value: string }[]>([]);
  const [genderOptions, setGenderOptions] = useState<{ label: string; value: string }[]>([]);
  const [religionOptions, setReligionOptions] = useState<{ label: string; value: string }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [academicYearLabel, setAcademicYearLabel] = useState("Loading...");

  // Raw lookups for deriving flags
  const [natLookups, setNatLookups] = useState<LookupResponse[]>([]);
  const [catLookups, setCatLookups] = useState<LookupResponse[]>([]);

  // All academic years, kept so the selection effect below can re-resolve
  // the target year once the degree type (isCertificateCourse) arrives —
  // registration data and academic years can each load first.
  const [academicYears, setAcademicYears] = useState<Awaited<ReturnType<typeof getAcademicYears>>>([]);

  /* ── Check USN & auto-bind fields from Registration ─────────────────────── */
  const [regData, setRegData] = useState<any>(null);

  // Degree type inherited from registration — same convention used in
  // degree_course.tsx.
  const [, setRegDegreeTypeId] = useState<string>("");
  const [regDegreeTypeName, setRegDegreeTypeName] = useState<string>("");

  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    if (!username) return;
    getRegistrationByUsername(username)
      .then((reg) => {
        if (reg?.usnNo) setHasUsn(true);
        if (reg?.degreeTypeId) setRegDegreeTypeId(reg.degreeTypeId);
        if (reg?.degreeTypeName) setRegDegreeTypeName(reg.degreeTypeName);
        setRegData(reg);
      })
      .catch(() => { });
  }, []);

  // Registrants who chose "Certificate Course" / "Certification" at
  // registration time — same convention used in degree_course.tsx.
  const isCertificateCourse = useMemo(
    () => regDegreeTypeName.toLowerCase().includes("certificat"),
    [regDegreeTypeName]
  );

  // Auto-fill from the registration record for this username, but never
  // override values already saved on this application (initialData wins).
  useEffect(() => {
    if (!regData) return;
    setForm((prev) => ({
      ...prev,
      fullName: initialData?.fullName ?? regData.name ?? prev.fullName,
      phone: initialData?.phone ?? regData.mobile ?? prev.phone,
      email: initialData?.email ?? regData.email ?? prev.email,
      dob:
        initialData?.dob ??
        (regData.dob ? String(regData.dob).slice(0, 10) : prev.dob),
      nationality:
        initialData?.nationality ?? regData.nationalityId ?? prev.nationality,
      aadharNumber:
        initialData?.aadharNumber ?? regData.aadharNo ?? prev.aadharNumber,
      passportNumber:
        initialData?.passportNumber ?? regData.passportNo ?? prev.passportNumber,
    }));
  }, [regData, initialData]);

  /* ── Load lookups ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const toOptions = (items: LookupResponse[]) =>
      items.map((i) => ({ label: i.name ?? i.code ?? i.id, value: i.id }));

    Promise.all([
      getLookupsByType("Nationality", " "),
      getLookupsByType("Gender", ""),
      getLookupsByType("Religion", ""),
      getLookupsByType("Category", ""),
      getAcademicYears(),
    ]).then(([nat, gen, rel, cat, years]) => {
      setNatLookups(nat);
      setCatLookups(cat);
      setNationalityOptions(toOptions(nat));
      setGenderOptions(toOptions(gen));
      setReligionOptions(toOptions(rel));
      setCategoryOptions(toOptions(cat));
      setAcademicYears(years);
    });
  }, []);

  // Resolve which academic year to lock the application to: Certification
  // Course registrants (per regDegreeTypeName from registration) are pinned
  // to 2025-2026, everyone else to 2026-2027. Re-runs whenever the academic
  // years list or the degree type arrives, since either can load first.
  useEffect(() => {
    if (academicYears.length === 0) return;
    const targetDesc = isCertificateCourse ? "2025-2026" : "2026-2027";
    const target = academicYears.find((y) => (y.description ?? "").includes(targetDesc));
    const year = target ?? academicYears[academicYears.length - 1];
    if (year) {
      setAcademicYearLabel(year.description ?? year.id);
      setForm((prev) => ({ ...prev, academicYearId: year.id }));
    } else {
      setAcademicYearLabel("N/A");
    }
  }, [academicYears, isCertificateCourse]);

  // Auto-select Indian nationality as a default, unless a nationality is
  // already known from the saved application or the registration record.
  useEffect(() => {
    if (natLookups.length === 0) return;
    if (initialData?.nationality || regData?.nationalityId) return;
    const indian = natLookups.find((n) => {
      const s = (n.code ?? n.name ?? "").toLowerCase();
      return (s.includes("indian") || s === "india") && !s.includes("non");
    });
    if (indian) {
      setForm((prev) => ({ ...prev, nationality: prev.nationality || indian.id }));
    }
  }, [natLookups, initialData, regData]);

  /* ── Derived flags ──────────────────────────────────────────────────────── */
  // ───────── NATIONALITY ─────────
  const selNat = natLookups.find((n) => n.id === form.nationality);
  const natCode = selNat?.code ?? "";

  const isIndian = natCode === "001";
  const isNonIndian = natCode === "002";


  // ───────── RELIGION ─────────


  // ───────── CATEGORY ─────────
  const selCat = catLookups.find((c) => c.id === form.category);

  const isGM = (selCat?.name ?? "").trim().toUpperCase() === "GM";

  // Applicants who never see the Category picker — non-Karnataka Indians and
  // foreign nationals alike (the whole picker is nested inside isIndian &&
  // isKarnataka) — need a sane default rather than sending no category at
  // all. GM is that default, matched by name rather than code since the
  // code is an opaque lookup detail while the name reads clearly.
  const gmCategoryId = catLookups.find(
    (c) => (c.name ?? "").trim().toUpperCase() === "GM"
  )?.id;


  // ───────── KARNATAKA ─────────
  const isKarnataka = form.karnatakaYn === "true";
  const isNotKarnataka = form.karnatakaYn === "false";

  /* ── Helpers ────────────────────────────────────────────────────────────── */
  const set = (field: keyof PersonalDetailsData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    set(name as keyof PersonalDetailsData, value);
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const err = (field: keyof PersonalDetailsData, msg: string) =>
    setErrors((prev) => ({ ...prev, [field]: msg }));

  /* ── Validation ─────────────────────────────────────────────────────────── */
  const validate = (): boolean => {
    let ok = true;
    const e = (f: keyof PersonalDetailsData, msg: string) => { err(f, msg); ok = false; };
    const nameRe = /^[A-Za-z ]+$/;
    const mobileRe = /^[6-9]\d{9}$/;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const postalCodeRe = /^[1-9][0-9]{2}\s?[0-9]{3}$/;

    if (!form.permanentPostalCode) e("permanentPostalCode", "Required");
    else if (!postalCodeRe.test(form.permanentPostalCode)) e("permanentPostalCode", "Invalid postal code (e.g. 560001)");

    if (!form.fullName) e("fullName", "Required");
    else if (!nameRe.test(form.fullName)) e("fullName", "Only letters and spaces");

    if (!form.phone) e("phone", "Required");
    else if (!mobileRe.test(form.phone)) e("phone", "Must be a valid 10-digit mobile number");

    if (!form.email) e("email", "Required");
    else if (!emailRe.test(form.email)) e("email", "Invalid email address");

    if (!form.dob) {
      e("dob", "Required");
    } else {
      const dob = new Date(form.dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dob > today) {
        e("dob", "Date of birth cannot be a future date");
      } else {
        const minAgeDate = new Date(today);
        minAgeDate.setFullYear(today.getFullYear() - 15);
        if (dob > minAgeDate) {
          e("dob", "Applicant must be at least 15 years old");
        }
      }
    }
    if (!form.gender) e("gender", "Please select gender");

    if (!form.nationality) e("nationality", "Please select nationality");

    if (isIndian) {
      if (!form.aadharNumber) e("aadharNumber", "Required");
      else if (form.aadharNumber.length !== 12) e("aadharNumber", "Aadhar must be 12 digits");

      if (!form.karnatakaYn) e("karnatakaYn", "Please select");

      if (isNotKarnataka && !form.homeState) e("homeState", "Required");
      else if (isNotKarnataka && form.homeState.trim().toLowerCase() === "karnataka") {
        e("homeState", "Please select \"Yes\" above instead");
      }

      if (isKarnataka && !form.religion) e("religion", "Required");

      if (isKarnataka) {
        if (!form.category) e("category", "Required");
        if (!form.caste) e("caste", "Required");
        if (!isGM && form.category) {
          if (!form.annualIncome) e("annualIncome", "Required");
          if (!form.rdNumber) e("rdNumber", "Required");
          if (!form.casteRdNumber) e("casteRdNumber", "Required");
        }
      }
    }

    if (isNonIndian) {
      if (!form.passportNumber) e("passportNumber", "Required");
      if (!form.visaNumber) e("visaNumber", "Required");
      if (!form.passportExpiry) e("passportExpiry", "Required");
      if (!form.visaExpiry) e("visaExpiry", "Required");
    }

    if (!form.fatherName) e("fatherName", "Required");
    else if (!nameRe.test(form.fatherName)) e("fatherName", "Only letters and spaces");
    if (!form.fatherMobile) e("fatherMobile", "Required");
    else if (!mobileRe.test(form.fatherMobile)) e("fatherMobile", "Must be a valid 10-digit mobile number");
    if (!form.fatherOccupation) e("fatherOccupation", "Required");

    if (!form.motherName) e("motherName", "Required");
    else if (!nameRe.test(form.motherName)) e("motherName", "Only letters and spaces");
    if (!form.motherMobile) e("motherMobile", "Required");
    else if (!mobileRe.test(form.motherMobile)) e("motherMobile", "Must be a valid 10-digit mobile number");
    if (!form.motherOccupation) e("motherOccupation", "Required");

    if (!form.permanentAddressLine1) e("permanentAddressLine1", "Required");
    if (!form.permanentCity) e("permanentCity", "Required");
    if (!form.permanentState) e("permanentState", "Required");
    if (!form.permanentCountry) e("permanentCountry", "Required");
    if (!form.permanentPostalCode) e("permanentPostalCode", "Required");

    if (!form.sameAsPermanent) {
      if (!form.presentAddressLine1) e("presentAddressLine1", "Required");
      if (!form.presentCity) e("presentCity", "Required");
      if (!form.presentState) e("presentState", "Required");
      if (!form.presentCountry) e("presentCountry", "Required");
      if (!form.presentPostalCode) e("presentPostalCode", "Required");
    }

    return ok;
  };

  /* ── Save & Next ────────────────────────────────────────────────────────── */
  const handleNext = async () => {
    if (readOnly) { onNext(applicationId!); return; }
    if (!validate()) {
      showToast("Please fix the errors before proceeding.", "error");
      return;
    }

    const present = form.sameAsPermanent
      ? {
        presentAddressLine1: form.permanentAddressLine1,
        presentAddressLine2: form.permanentAddressLine2,
        presentCity: form.permanentCity,
        presentState: form.permanentState,
        presentCountry: form.permanentCountry,
        presentPostalCode: form.permanentPostalCode,
      }
      : {
        presentAddressLine1: form.presentAddressLine1,
        presentAddressLine2: form.presentAddressLine2,
        presentCity: form.presentCity,
        presentState: form.presentState,
        presentCountry: form.presentCountry,
        presentPostalCode: form.presentPostalCode,
      };

    const payload = {
      name: form.fullName,
      phone: form.phone || undefined,
      email: form.email || undefined,
      dob: form.dob || undefined,
      gender: form.gender || undefined,
      academicYearId: form.academicYearId || undefined,
      nationalityId: form.nationality || undefined,

      // Indian fields
      aadharNo: form.aadharNumber || undefined,
      karnatakaYn: form.karnatakaYn === "true" ? true : form.karnatakaYn === "false" ? false : undefined,
      placeOfBirth: form.homeState || undefined,
      religion: form.religion || undefined,
      categoryId: (isNotKarnataka || isNonIndian) ? (gmCategoryId ?? null) : (form.category || undefined),
      caste: form.caste || undefined,
      annualIncome: form.annualIncome ? Number(form.annualIncome) : undefined,
      rdNumber: form.rdNumber || undefined,
      casteRdNumber: form.casteRdNumber || undefined,

      // Non-Indian fields
      passportNo: form.passportNumber || undefined,
      visaNo: form.visaNumber || undefined,
      passportExpiryDate: form.passportExpiry || undefined,
      visaExpiryDate: form.visaExpiry || undefined,

      // Parents
      fatherName: form.fatherName || undefined,
      fatherOccupation: form.fatherOccupation || undefined,
      fatherNo: form.fatherMobile || undefined,
      motherName: form.motherName || undefined,
      motherOccupation: form.motherOccupation || undefined,
      motherNo: form.motherMobile || undefined,
      guardianName: form.guardianName || undefined,
      guardianNo: form.guardianMobile || undefined,

      // IDs
      statsId: form.satsId || undefined,
      apaarId: form.apaarId || undefined,

      // Address
      permanentAddressLine1: form.permanentAddressLine1 || undefined,
      permanentAddressLine2: form.permanentAddressLine2 || undefined,
      permanentCity: form.permanentCity || undefined,
      permanentState: form.permanentState || undefined,
      permanentCountry: form.permanentCountry || undefined,
      permanentPostalCode: form.permanentPostalCode || undefined,
      sameAsPermanet: form.sameAsPermanent,
      ...present,
    };

    try {
      setLoading(true);
      let appId = applicationId;
      if (appNo) {
        await updateApplication(appNo, payload);
      } else {
        const result = await createApplication(payload);
        appId = result.id;
      }
      showToast("Saved successfully!", "success");
      setTimeout(() => onNext(appId!), 1500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      showToast(e?.response?.data?.message ?? e?.message ?? "Save failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── Render helpers ─────────────────────────────────────────────────────── */
  const SectionHeading = ({ title }: { title: string }) => (
    <h4 className="pb-2 mb-4 text-sm font-semibold border-b border-gray-100 text-text">{title}</h4>
  );

  const SubHeading = ({ title }: { title: string }) => (
    <p className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">{title}</p>
  );

  /* ── JSX ────────────────────────────────────────────────────────────────── */
  return (
    <div data-testid="personal-details-section" className="space-y-6">
      {toast && (
        <div className="fixed z-50 top-5 right-5">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}

      <div className={readOnly ? "pointer-events-none opacity-70 select-none space-y-6" : "space-y-6"}>

        {/* ── 1. Basic Details ──────────────────────────────────────────────── */}
        <section className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl sm:p-6">
          <SectionHeading title="Basic Details (ಮೂಲ ಮಾಹಿತಿ)" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Academic Year — locked */}
            <div className="flex flex-col w-full gap-1">
              <label className="flex items-center gap-1 text-sm font-medium text-text">
                Academic Year (ಶೈಕ್ಷಣಿಕ ವರ್ಷ) <Lock size={12} className="text-gray-400" />
              </label>
              <div className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500 cursor-not-allowed select-none">
                {academicYearLabel}
              </div>
            </div>

            <Input
              label="Full Name (ಪೂರ್ಣ ಹೆಸರು)"
              name="fullName"
              inputMode="alpha"
              value={form.fullName}
              onChange={() => { }}
              placeholder="Enter full name"
              error={errors.fullName}
              disabled
              className="text-gray-500 cursor-not-allowed bg-gray-50"
              required
            />
            <Input
              label="Date of Birth (ಜನ್ಮ ದಿನಾಂಕ)"
              name="dob"
              type="date"
              value={form.dob}
              max={(() => {
                const d = new Date();
                d.setFullYear(d.getFullYear() - 15);
                return d.toISOString().split("T")[0];
              })()}
              onChange={() => { }}
              disabled
              className="bg-gray-50 text-gray-500 cursor-not-allowed [&::-webkit-calendar-picker-indicator]:hidden"
              error={errors.dob}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-3">
            <div>
              <Radio
                label="Gender (ಲಿಂಗ)"
                name="gender"
                options={genderOptions}
                value={form.gender}
                onChange={(v) => {
                  set("gender", String(v));
                  setErrors((p) => ({ ...p, gender: "" }));
                }}
                required
              />
              {errors.gender && <p className="mt-1 text-xs text-red-500">{errors.gender}</p>}
            </div>
            <Input
              label="Mobile Number (ಮೊಬೈಲ್ ಸಂಖ್ಯೆ)"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={() => { }}
              placeholder="10-digit mobile number"
              error={errors.phone}
              disabled
              className="text-gray-500 cursor-not-allowed bg-gray-50"
              required
            />
            <Input
              label="Email (ಇಮೇಲ್)"
              name="email"
              type="email"
              value={form.email}
              onChange={() => { }}
              placeholder="Enter email"
              error={errors.email}
              disabled
              className="text-gray-500 cursor-not-allowed bg-gray-50"
              required
            />
          </div>
        </section>

        {/* ── 2. Nationality ────────────────────────────────────────────────── */}
        <section className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl sm:p-6">
          <SectionHeading title="Nationality & Identity (ರಾಷ್ಟ್ರೀಯತೆ)" />
          <div className="pointer-events-none select-none opacity-70">
            <Radio
              label="Nationality (ರಾಷ್ಟ್ರೀಯತೆ)"
              name="nationality"
              options={nationalityOptions}
              value={form.nationality}
              onChange={() => { }}
              required
            />
          </div>
          {errors.nationality && <p className="mt-1 text-xs text-red-500">{errors.nationality}</p>}

          {/* ── Indian ─────────────────────────────────────────────────────── */}
          {isIndian && (
            <div className="p-4 mt-4 space-y-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Aadhar Number (ಆಧಾರ್ ಸಂಖ್ಯೆ)"
                  name="aadharNumber"
                  value={form.aadharNumber}
                  onChange={() => { }}
                  placeholder="12-digit Aadhar"
                  error={errors.aadharNumber}
                  disabled
                  className="text-gray-500 cursor-not-allowed bg-gray-50"
                  required
                />
                <div>
                  <Radio
                    label="Are you from Karnataka? (ಕರ್ನಾಟಕದವರೇ?)"
                    name="karnatakaYn"
                    options={[
                      { label: "Yes (ಹೌದು)", value: "true" },
                      { label: "No (ಇಲ್ಲ)", value: "false" },
                    ]}
                    value={form.karnatakaYn}
                    onChange={(v) => {
                      setForm((p) => ({ ...p, karnatakaYn: String(v), homeState: "", religion: "", category: "", caste: "", annualIncome: "", rdNumber: "", casteRdNumber: "" }));
                      setErrors((p) => ({ ...p, karnatakaYn: "", homeState: "" }));
                    }}
                    required
                  />
                  {errors.karnatakaYn && <p className="mt-1 text-xs text-red-500">{errors.karnatakaYn}</p>}
                </div>
              </div>

              {/* Karnataka No → show state */}
              {isNotKarnataka && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="State (ರಾಜ್ಯ)"
                    name="homeState"
                    inputMode="alpha"
                    value={form.homeState}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw.trim().toLowerCase() === "karnataka") {
                        // They typed Karnataka in the "other state" field —
                        // correct the radio selection instead of the text.
                        setForm((p) => ({
                          ...p,
                          karnatakaYn: "true",
                          homeState: "",
                          religion: "",
                          category: "",
                          caste: "",
                          annualIncome: "",
                          rdNumber: "",
                          casteRdNumber: "",
                        }));
                        setErrors((p) => ({ ...p, karnatakaYn: "", homeState: "" }));
                        return;
                      }
                      set("homeState", raw);
                      setErrors((p) => ({ ...p, homeState: "" }));
                    }}
                    placeholder="Enter your state"
                    error={errors.homeState}
                    required
                  />
                </div>
              )}

              {/* Religion — shown only when Karnataka = Yes */}
              {isKarnataka && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Select
                    label="Religion (ಧರ್ಮ)"
                    name="religion"
                    options={religionOptions}
                    value={form.religion}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, religion: e.target.value, category: "", caste: "", annualIncome: "", rdNumber: "", casteRdNumber: "" }));
                      setErrors((p) => ({ ...p, religion: "", category: "", caste: "" }));
                    }}
                    placeholder="Select Religion"
                    error={errors.religion}
                    required
                  />

                  {/* Category + Caste */}
                  {(
                    <>
                      <Select
                        label="Category (ವರ್ಗ)"
                        name="category"
                        options={categoryOptions}
                        value={form.category}
                        onChange={(e) => {
                          setForm((p) => ({ ...p, category: e.target.value, annualIncome: "", rdNumber: "", casteRdNumber: "" }));
                          setErrors((p) => ({ ...p, category: "", annualIncome: "", rdNumber: "" }));
                        }}
                        placeholder="Select Category"
                        error={errors.category}
                        required
                      />
                      <Input
                        label="Caste (ಜಾತಿ)"
                        name="caste"
                        value={form.caste}
                        onChange={handleChange}
                        placeholder="Enter caste"
                        error={errors.caste}
                        required
                      />
                    </>
                  )}
                </div>
              )}

              {/* Non-GM category → Annual Income + RD Number */}
              {form.category && !isGM && (
                <div className="grid grid-cols-1 gap-4 p-4 border border-yellow-200 rounded-lg sm:grid-cols-3 bg-yellow-50">
                  <Input
                    label="Annual Income (ವಾರ್ಷಿಕ ಆದಾಯ)"
                    name="annualIncome"
                    value={form.annualIncome}
                    onChange={(e) => {
                      const v = numericOnly(e.target.value);
                      set("annualIncome", v);
                      setErrors((p) => ({ ...p, annualIncome: "" }));
                    }}
                    placeholder="Annual Income"
                    error={errors.annualIncome}
                    required
                  />
                  <Input
                    label="RD Number (ಆರ್‌ಡಿ ಸಂಖ್ಯೆ)"
                    name="rdNumber"
                    value={form.rdNumber}
                    onChange={(e) => {
                      const v = numericOnly(e.target.value);
                      set("rdNumber", v);
                      setErrors((p) => ({ ...p, rdNumber: "" }));
                    }}
                    placeholder="RD Number"
                    error={errors.rdNumber}
                    required
                  />
                  <Input
                    label="Caste RD Number (ಜಾತಿ ಆರ್‌ಡಿ ಸಂಖ್ಯೆ)"
                    name="casteRdNumber"
                    value={form.casteRdNumber}
                    onChange={(e) => {
                      const v = numericOnly(e.target.value);
                      set("casteRdNumber", v);
                      setErrors((p) => ({ ...p, casteRdNumber: "" }));
                    }}
                    placeholder="Caste RD Number"
                    error={errors.casteRdNumber}
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Non-Indian ─────────────────────────────────────────────────── */}
          {isNonIndian && (
            <div className="p-4 mt-4 space-y-4 border border-green-200 rounded-lg bg-green-50">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Passport Number"
                  name="passportNumber"
                  value={form.passportNumber}
                  onChange={() => { }}
                  placeholder="Passport number"
                  error={errors.passportNumber}
                  disabled
                  className="text-gray-500 cursor-not-allowed bg-gray-50"
                  required
                />
                <Input
                  label="Visa Number"
                  name="visaNumber"
                  value={form.visaNumber}
                  onChange={handleChange}
                  placeholder="Visa number"
                  error={errors.visaNumber}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Input
                    label="Passport Expiry Date"
                    name="passportExpiry"
                    type="date"
                    value={form.passportExpiry}
                    onChange={handleChange}
                    error={errors.passportExpiry}
                    required
                  />
                  <p className="text-xs text-gray-400">Must not be before today</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Input
                    label="Visa Expiry Date"
                    name="visaExpiry"
                    type="date"
                    value={form.visaExpiry}
                    onChange={handleChange}
                    error={errors.visaExpiry}
                    required
                  />
                  <p className="text-xs text-gray-400">Must not be before today</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── 3. Parents & Guardian ─────────────────────────────────────────── */}
        <section className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl sm:p-6">
          <SectionHeading title="Parents & Guardian (ಪೋಷಕರು ಮತ್ತು ಗಾರ್ಡಿಯನ್)" />
          <div className="space-y-6">
            {/* Father */}
            <div>
              <SubHeading title="Father's Information" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  label="Father's Name (ತಂದೆಯ ಹೆಸರು)"
                  name="fatherName"
                  inputMode="alpha"
                  value={form.fatherName}
                  onChange={handleChange}
                  placeholder="Father's name"
                  error={errors.fatherName}
                  required
                />
                <Input
                  label="Father's Occupation (ತಂದೆಯ ಉದ್ಯೋಗ)"
                  name="fatherOccupation"
                  inputMode="alpha"
                  value={form.fatherOccupation}
                  onChange={handleChange}
                  placeholder="Father's occupation"
                  error={errors.fatherOccupation}
                  required
                />
                <Input
                  label="Father's Mobile (ತಂದೆಯ ಮೊಬೈಲ್)"
                  name="fatherMobile"
                  type="tel"
                  value={form.fatherMobile}
                  onChange={(e) => {
                    const v = numericOnly(e.target.value).slice(0, 10);
                    set("fatherMobile", v);
                    setErrors((p) => ({ ...p, fatherMobile: "" }));
                  }}
                  placeholder="Father's mobile"
                  error={errors.fatherMobile}
                  required
                />
              </div>
            </div>

            {/* Mother */}
            <div>
              <SubHeading title="Mother's Information" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  label="Mother's Name (ತಾಯಿಯ ಹೆಸರು)"
                  name="motherName"
                  inputMode="alpha"
                  value={form.motherName}
                  onChange={handleChange}
                  placeholder="Mother's name"
                  error={errors.motherName}
                  required
                />
                <Input
                  label="Mother's Occupation (ತಾಯಿಯ ಉದ್ಯೋಗ)"
                  name="motherOccupation"
                  inputMode="alpha"
                  value={form.motherOccupation}
                  onChange={handleChange}
                  placeholder="Mother's occupation"
                  error={errors.motherOccupation}
                  required
                />
                <Input
                  label="Mother's Mobile (ತಾಯಿಯ ಮೊಬೈಲ್)"
                  name="motherMobile"
                  type="tel"
                  value={form.motherMobile}
                  onChange={(e) => {
                    const v = numericOnly(e.target.value).slice(0, 10);
                    set("motherMobile", v);
                    setErrors((p) => ({ ...p, motherMobile: "" }));
                  }}
                  placeholder="Mother's mobile"
                  error={errors.motherMobile}
                  required
                />
              </div>
            </div>

            {/* Guardian */}
            <div>
              <SubHeading title="Guardian's Information (Optional)" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Guardian's Name (ಗಾರ್ಡಿಯನ್ ಹೆಸರು)"
                  name="guardianName"
                  inputMode="alpha"
                  value={form.guardianName}
                  onChange={handleChange}
                  placeholder="Guardian's name"
                />
                <Input
                  label="Guardian's Mobile (ಗಾರ್ಡಿಯನ್ ಮೊಬೈಲ್)"
                  name="guardianMobile"
                  type="tel"
                  value={form.guardianMobile}
                  onChange={(e) => {
                    const v = numericOnly(e.target.value).slice(0, 10);
                    set("guardianMobile", v);
                  }}
                  placeholder="Guardian's mobile"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. ID Numbers — hidden for USN-enrolled students ─────────────── */}
        {!hasUsn && (
          <section className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl sm:p-6">
            <SectionHeading title="ID Numbers (ಗುರುತಿನ ಸಂಖ್ಯೆಗಳು)" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="SATS ID (ಸಾಟ್ಸ್ ಐಡಿ)"
                name="satsId"
                value={form.satsId}
                onChange={handleChange}
                placeholder="Enter SATS ID"
              />
              <Input
                label="APAAR ID (ಅಪಾರ್ ಐಡಿ)"
                name="apaarId"
                value={form.apaarId}
                onChange={handleChange}
                placeholder="Enter APAAR ID"
              />
            </div>
          </section>
        )}

        {/* ── 5. Address ────────────────────────────────────────────────────── */}
        <section className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl sm:p-6">
          <SectionHeading title="Address (ವಿಳಾಸ)" />

          {/* Permanent Address */}
          <div className="mb-6">
            <SubHeading title="Permanent Address" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Address Line 1"
                name="permanentAddressLine1"
                value={form.permanentAddressLine1}
                onChange={handleChange}
                placeholder="House / Flat / Street"
                error={errors.permanentAddressLine1}
                required
              />
              <Input
                label="Address Line 2 (Enter Village/Taluk)"
                name="permanentAddressLine2"
                value={form.permanentAddressLine2}
                onChange={handleChange}
                placeholder="Village / Taluk "
              />
            </div>
            <div className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-4">
              <Input
                label="City/District"
                name="permanentCity"
                inputMode="alpha"
                value={form.permanentCity}
                onChange={handleChange}
                placeholder="City/District"
                error={errors.permanentCity}
                required
              />
              <Input
                label="State"
                name="permanentState"
                inputMode="alpha"
                value={form.permanentState}
                onChange={handleChange}
                placeholder="State"
                error={errors.permanentState}
                required
              />
              <Input
                label="Country"
                name="permanentCountry"
                inputMode="alpha"
                value={form.permanentCountry}
                onChange={handleChange}
                placeholder="Country"
                error={errors.permanentCountry}
                required
              />
              <Input
                label="Postal Code"
                name="permanentPostalCode"
                inputMode="numeric"
                value={form.permanentPostalCode}
                onChange={(e) => {
                  const v = numericOnly(e.target.value).slice(0, 6);
                  set("permanentPostalCode", v);
                  setErrors((p) => ({ ...p, permanentPostalCode: "" }));
                }}
                placeholder="6-digit postal code"
                error={errors.permanentPostalCode}
                required
              />
            </div>
          </div>

          {/* Same as Permanent checkbox */}
          <label className="flex items-center gap-2 py-3 my-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={form.sameAsPermanent}
              onChange={(e) => setForm((p) => ({ ...p, sameAsPermanent: e.target.checked }))}
              className="w-4 h-4 border-gray-300 rounded cursor-pointer accent-primary"
            />
            <span className="text-sm font-medium text-text">Current address same as permanent address</span>
          </label>

          {/* Current Address */}
          {!form.sameAsPermanent && (
            <div>
              <SubHeading title="Current Address" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Address Line 1"
                  name="presentAddressLine1"
                  value={form.presentAddressLine1}
                  onChange={handleChange}
                  placeholder="House / Flat / Street"
                  error={errors.presentAddressLine1}
                  required
                />
                <Input
                  label="Address Line 2(Enter Village/Taluk)"
                  name="presentAddressLine2"
                  value={form.presentAddressLine2}
                  onChange={handleChange}
                  placeholder="Village / Taluk"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-4">
                <Input
                  label="City/District"
                  name="presentCity"
                  inputMode="alpha"
                  value={form.presentCity}
                  onChange={handleChange}
                  placeholder="City/District"
                  error={errors.presentCity}
                  required
                />
                <Input
                  label="State"
                  name="presentState"
                  inputMode="alpha"
                  value={form.presentState}
                  onChange={handleChange}
                  placeholder="State"
                  error={errors.presentState}
                  required
                />
                <Input
                  label="Country"
                  name="presentCountry"
                  inputMode="alpha"
                  value={form.presentCountry}
                  onChange={handleChange}
                  placeholder="Country"
                  error={errors.presentCountry}
                  required
                />
                <Input
                  label="Postal Code"
                  name="presentPostalCode"
                  inputMode="numeric"
                  value={form.presentPostalCode}
                  onChange={(e) => {
                    const v = numericOnly(e.target.value).slice(0, 6);
                    set("presentPostalCode", v);
                    setErrors((p) => ({ ...p, presentPostalCode: "" }));
                  }}
                  placeholder="6-digit postal code"
                  error={errors.presentPostalCode}
                  required
                />
              </div>
            </div>
          )}
        </section>

      </div>{/* end readOnly wrapper */}

      {/* ── Next Button ───────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-4 mt-2 border-t border-gray-100">
        <Button onClick={handleNext} disabled={loading} className="w-full sm:w-48">
          {loading ? "Saving..." : "Next →"}
        </Button>
      </div>
    </div>
  );
}