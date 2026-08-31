import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  User,
  Phone,
  Calendar,
  FileText,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Send,
  MapPin,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Toast from "../../components/ui/Toast";
import { createTestId } from "../../utils/testId";
import { getLookupsByType, type LookupResponse } from "../../services/lookupService";
import { createRegistration, getRegistrationByUsername, checkIdentityExists, resumeIncompleteRegistration } from "../../services/registrationService";
import { sendOtp, verifyOtp, resendOtp } from "../../services/otpService";
import { setPassword as setUserPassword } from "../../services/loginService";
import { getStudents } from "../../services/studentService";

type RegistrationStep =
  | "admission-type"
  | "basic-info"
  | "otp-verification"
  | "password-setup"
  | "success";

// ── Module-scope helpers & sub-components ──────────────────────────────
// These used to be defined *inside* the Registration component. Because a
// new function (and therefore a "new component type" as far as React is
// concerned) was created on every render, React unmounted and remounted
// their entire DOM subtree — logo image, step circles, transitions and
// all — on every single keystroke anywhere in the form. Hoisting them out
// here means they're stable across renders, so React just diffs props
// instead of tearing the DOM down and rebuilding it, which is what was
// making the form feel janky.

const REGISTRATION_STEPS = [
  { num: 1, label: "Information", id: "basic-info" },
  { num: 2, label: "Verification", id: "otp-verification" },
  { num: 3, label: "Password", id: "password-setup" },
] as const;

// Step Indicator Component
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-4 sm:gap-6">
        {REGISTRATION_STEPS.map((s, index) => (
          <div key={s.id} className="flex items-center">
            {/* Circle */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${currentStep >= s.num
                ? "bg-secondary text-white"
                : "bg-gray-200 text-gray-500"
                }`}
            >
              {currentStep > s.num ? "✓" : s.num}
            </div>

            {/* Label */}
            <div className="hidden ml-2 sm:block">
              <p className="text-xs font-semibold text-text whitespace-nowrap">
                {s.label}
              </p>
            </div>

            {/* Line */}
            {index < REGISTRATION_STEPS.length - 1 && (
              <div
                className={`w-8 sm:w-12 h-[2px] mx-2 rounded transition-all duration-300 ${currentStep > s.num ? "bg-secondary" : "bg-gray-200"
                  }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Card Header — logo + title, shown inside every step card
function CardHeader() {
  return (
    <div className="pb-5 mb-6 border-b border-gray-100 sm:pb-6 sm:mb-8">
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <img
          src="/logo2.png"
          alt="University Logo"
          className="flex-shrink-0 object-contain h-14 w-14 sm:w-16 sm:h-16"
        />
        <h1 className="text-lg font-bold leading-tight sm:text-2xl text-primary">
          Mahatma Gandhi Rural Development and Panchayat Raj University, Gadag
        </h1>
      </div>
      <p className="mt-2 text-lg font-bold text-center sm:text-lg text-secondary">
        ADMISSION REGISTRATION
      </p>
    </div>
  );
}

// Pure formatting helpers — they don't touch component state, so they're
// hoisted here instead of being recreated as new function instances on
// every render.
const formatFullName = (value: string) =>
  value
    .split(" ")
    .map((word) =>
      word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");

const formatUsername = (value: string) => {
  const noSpaces = value.replace(/\s/g, "");
  if (!noSpaces) return noSpaces;
  return noSpaces.charAt(0).toUpperCase() + noSpaces.slice(1);
};

const formatEmail = (value: string) => value.replace(/\s/g, "").toLowerCase();

const formatPassport = (value: string) => value.toUpperCase();

// Precompiled regexes reused across validation/render instead of being
// allocated fresh on every call.
const AADHAR_PATTERN = /^[0-9]{12}$/;
const NAME_PATTERN = /^[A-Za-z ]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const REPEATED_DIGITS_PATTERN = /^(\d)\1{9}$/;
const OTP_PATTERN = /^[0-9]{6}$/;
const UPPERCASE_PATTERN = /[A-Z]/;
const DIGIT_PATTERN = /[0-9]/;

export default function Registration() {
  const navigate = useNavigate();

  // Form States
  const [step, setStep] = useState<RegistrationStep>("admission-type");

  // Admission type
  const [existingStudent, setExistingStudent] = useState<"yes" | "no" | "">("");
  const [prevRegNumber, setPrevRegNumber] = useState("");
  const [prevRegError, setPrevRegError] = useState("");
  const [prevRegChecking, setPrevRegChecking] = useState(false);
  const [usnVerified, setUsnVerified] = useState(false);
  const [isExamStudent, setIsExamStudent] = useState<"yes" | "no" | "">("");

  // Basic Info
  const [username, setUsername] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "available" | "taken">("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [nationalityName, setNationalityName] = useState("");
  const [nationalityId, setNationalityId] = useState<string | null>(null);
  const [aadhar, setAadhar] = useState("");
  const [aadharChecking, setAadharChecking] = useState(false);
  const [aadharStatus, setAadharStatus] = useState<"available" | "incomplete" | "registered">("available");
  const [passport, setPassport] = useState("");
  const [passportChecking, setPassportChecking] = useState(false);
  const [passportStatus, setPassportStatus] = useState<"available" | "incomplete" | "registered">("available");
  const [degreeTypeId, setDegreeTypeId] = useState<string | null>(null);
  const [pendingDegreeType, setPendingDegreeType] = useState<LookupResponse | null>(null);
  const [incompleteResume, setIncompleteResume] = useState<{
    username: string;
    prefill: {
      name?: string | null;
      mobile?: string | null;
      email?: string | null;
      dob?: string | null;
      nationalityId?: string | null;
      degreeTypeId?: string | null;
    } | null;
  } | null>(null);

  // Memoized so this only recomputes when nationalityName actually
  // changes, instead of on every keystroke in unrelated fields.
  const isIndian = useMemo(
    () => nationalityName?.trim().toUpperCase() === "INDIAN",
    [nationalityName]
  );

  // OTP
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const applyIdentityPrefill = (
    prefill: {
      name?: string | null;
      mobile?: string | null;
      email?: string | null;
      dob?: string | null;
      nationalityId?: string | null;
      usnNo?: string | null;
    } | null | undefined,
    keepUsername?: string
  ) => {
    if (!prefill) return;
    if (prefill.name && existingStudent !== "yes") {
      setName(formatFullName(prefill.name));
    }
    if (prefill.mobile) setMobile(prefill.mobile);
    if (prefill.email) setEmail(formatEmail(prefill.email));
    if (prefill.dob) setDob(prefill.dob.slice(0, 10));
    if (prefill.nationalityId) {
      const match = nationalityOptions.find((o) => o.id === prefill.nationalityId);
      if (match) {
        setNationality(match.code!);
        setNationalityName(match.name ?? "");
        setNationalityId(match.id);
      }
    }
    if (keepUsername) {
      // Resuming this exact row — same username, already known to be theirs.
      setUsername(keepUsername);
      setUsernameStatus("available");
      if (prefill.usnNo) {
        setExistingStudent("yes");
        setPrevRegNumber(prefill.usnNo);
        setUsnVerified(true);
      }
    } else {
      // The old username belongs to a different, completed registration —
      // force a fresh one for this new program.
      setUsername("");
      setUsernameStatus("idle");
    }
  };

  // Fire the lookup automatically the moment a full 12-digit Aadhaar has
  // been typed, instead of waiting for the field to lose focus. This is now
  // the single place that runs (or resets) the Aadhaar identity check — a
  // separate onBlur handler used to duplicate this, and if the field blurred
  // right as the Send OTP button was clicked (which happens naturally, since
  // clicking anywhere first blurs whatever was previously focused), it fired
  // a brand-new check at that exact moment, leaving aadharChecking true and
  // making the click look like it did nothing.
  useEffect(() => {
    if (isIndian && AADHAR_PATTERN.test(aadhar)) {
      runAadharCheck();
    } else {
      setAadharStatus("available");
      setAllowedDegreeTypeIds(null);
      setIncompleteResume(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aadhar, isIndian]);

  const runAadharCheck = async () => {
    setAadharChecking(true);
    try {
      const result = await checkIdentityExists("aadhar", aadhar);
      const status = result?.exists
        ? result.completed
          ? "registered"
          : "incomplete"
        : "available";
      setAadharStatus(status);

      const allowed = result?.allowedDegreeTypeIds ?? null;
      setAllowedDegreeTypeIds(allowed);
      // If the degree type already picked is no longer allowed for this
      // identity, clear it so the person has to pick a valid one.
      if (allowed && degreeTypeId && !allowed.includes(degreeTypeId)) {
        setDegreeTypeId(null);
      }

      // Already has a completed registration, but there's still a program
      // left they can register for — prefill instead of blocking.
      if (result?.exists && result.completed && allowed && allowed.length > 0) {
        applyIdentityPrefill(result.prefill);
      }

      if (result?.exists && !result.completed && result.username) {
        setIncompleteResume({ username: result.username, prefill: result.prefill ?? null });
        applyIdentityPrefill(result.prefill, result.username);
        if (result.prefill?.degreeTypeId) {
          setDegreeTypeId(result.prefill.degreeTypeId);
        }
      } else {
        setIncompleteResume(null);
      }
    } catch {
      // Fail silently — server-side check on submit will catch duplicates
    } finally {
      setAadharChecking(false);
    }
  };

  const checkPassportOnBlur = async () => {
    if (isIndian || passport.trim().length < 6) {
      setPassportStatus("available");
      setAllowedDegreeTypeIds(null);
      setIncompleteResume(null);
      return;
    }
    setPassportChecking(true);
    try {
      const result = await checkIdentityExists("passport", passport.trim());
      const status = result?.exists
        ? result.completed
          ? "registered"
          : "incomplete"
        : "available";
      setPassportStatus(status);
      // Same reasoning as aadhaar above — status block owns this message.

      const allowed = result?.allowedDegreeTypeIds ?? null;
      setAllowedDegreeTypeIds(allowed);
      if (allowed && degreeTypeId && !allowed.includes(degreeTypeId)) {
        setDegreeTypeId(null);
      }

      if (result?.exists && result.completed && allowed && allowed.length > 0) {
        applyIdentityPrefill(result.prefill);
      }

      // Same reasoning as the Aadhar handler above — fill everything in at
      // once rather than waiting on an exact username re-match.
      if (result?.exists && !result.completed && result.username) {
        setIncompleteResume({ username: result.username, prefill: result.prefill ?? null });
        applyIdentityPrefill(result.prefill, result.username);
        if (result.prefill?.degreeTypeId) {
          setDegreeTypeId(result.prefill.degreeTypeId);
        }
      } else {
        setIncompleteResume(null);
      }
    } catch {
      // Fail silently — server-side check on submit will catch duplicates
    } finally {
      setPassportChecking(false);
    }
  };


  // Checked once on blur, same pattern as Aadhaar/Passport above. There's no
  // dedicated "is username available" endpoint currently imported here, so
  // this reuses getRegistrationByUsername: if a registration comes back, the
  // username is taken; if the lookup throws (e.g. 404 - not found), it's
  // available. If your backend's getRegistrationByUsername behaves
  // differently (e.g. resolves with null instead of throwing), swap the
  // logic in the try block accordingly.
  const checkUsernameOnBlur = async () => {
    if (!username.trim() || username.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    // This exact username matches the unfinished registration we found for
    // the Aadhar/Passport entered earlier — it's their own row, not someone
    // else's taken username. Treat it as available and only now apply the
    // degree type saved against it, instead of flagging "taken".
    if (incompleteResume && incompleteResume.username === username.trim()) {
      setUsernameStatus("available");
      if (incompleteResume.prefill?.degreeTypeId) {
        setDegreeTypeId(incompleteResume.prefill.degreeTypeId);
      }
      return;
    }

    setUsernameChecking(true);
    try {
      await getRegistrationByUsername(username);
      // Found an existing registration under this username -> taken.
      setUsernameStatus("taken");
    } catch {
      // Not found -> free to use.
      setUsernameStatus("available");
    } finally {
      setUsernameChecking(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    const newOtp = (otp.slice(0, index) + digit + otp.slice(index + 1)).slice(0, 6);
    setOtp(newOtp);
    setErrors((prev) => ({ ...prev, otp: "" }));
    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace") return;
    if (otp[index]) {
      setOtp(otp.slice(0, index) + otp.slice(index + 1));
    } else if (index > 0) {
      setOtp(otp.slice(0, index - 1));
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    setOtp(pasted);
    setErrors((prev) => ({ ...prev, otp: "" }));
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // Password
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Nationality options from API
  const [nationalityOptions, setNationalityOptions] = useState<LookupResponse[]>([]);
  const [degreeTypeOptions, setDegreeTypeOptions] = useState<LookupResponse[]>([]);
  // null = no restriction (identity not checked yet, or no prior registration found).
  // [] = identity already has every degree type registered — nothing left to pick.
  const [allowedDegreeTypeIds, setAllowedDegreeTypeIds] = useState<string[] | null>(null);
  const [studentRoleId, setStudentRoleId] = useState<string | undefined>();

  useEffect(() => {
    getLookupsByType("Nationality").then((options) => {
      setNationalityOptions(options);
      const indian = options.find(
        (o) => o.name?.trim().toUpperCase() === "INDIAN"
      );
      if (indian) {
        setNationality(indian.code!);
        setNationalityName(indian.name ?? "");
        setNationalityId(indian.id);
      }
    }).catch(console.error);

    getLookupsByType("DegreeType")
      .then((options) => {
        setDegreeTypeOptions(options);
      })
      .catch(console.error);

    getLookupsByType("Role").then((roles) => {
      const student = roles.find((r) => r.name?.toLowerCase() === "student");
      if (student) setStudentRoleId(student.id);
    }).catch(console.error);
  }, []);

  // Error and Loading States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleAdmissionTypeContinue = async () => {
    if (existingStudent === "yes" && !usnVerified) {
      if (!prevRegNumber.trim()) {
        setPrevRegError("Registration number is required");
        return;
      }
      setPrevRegChecking(true);
      try {
        const students = await getStudents();
        const found = students.find(
          (s) => s.registrationNumber.trim().toLowerCase() === prevRegNumber.trim().toLowerCase()
        );
        if (!found) {
          setPrevRegError("Registration number not found. Please contact the university.");
          return;
        }
        setUsnVerified(true);

        // Prefill Full Name from the student's on-file record so existing
        // students don't have to retype it. Still editable afterwards in
        // case it's stale or formatted differently than expected.
        if (found.studentName) {
          setName(formatFullName(found.studentName));
        }
      } catch {
        setPrevRegError("Could not verify registration number. Please try again.");
      } finally {
        setPrevRegChecking(false);
      }
      return;
    }

    if (existingStudent === "yes" && usnVerified && !isExamStudent) {
      return;
    }

    setStep("basic-info");
  };

  const validateBasicInfo = () => {
    const newErrors: Record<string, string> = {};

    /* ── NAME ── */
    if (!name.trim()) {
      newErrors.name = "Full name is required";
    } else if (!NAME_PATTERN.test(name.trim())) {
      newErrors.name = "Name must contain only alphabets";
    } else if (name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    }

    /* ── USERNAME ── */
    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (usernameStatus === "taken") {
      // Blank message intentionally — the status block under the field
      // already says "not available, try another one"; this key's presence
      // just blocks submission without duplicating that text.
      newErrors.username = "";
    }

    /* ── EMAIL ── */
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!EMAIL_PATTERN.test(email)) {
      newErrors.email = "Invalid email format";
    }

    /* ── MOBILE ── */
    if (!mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!MOBILE_PATTERN.test(mobile)) {
      newErrors.mobile = "Enter a valid Indian mobile number";
    } else if (REPEATED_DIGITS_PATTERN.test(mobile)) {
      newErrors.mobile = "Invalid mobile number";
    }

    /* ── DOB ── */
    if (!dob) {
      newErrors.dob = "Date of birth is required";
    }

    /* ── NATIONALITY ── */
    if (!nationality) {
      newErrors.nationality = "Please select nationality";
    }

    /* ── AADHAR ── */
    if (isIndian) {
      if (!aadhar.trim()) {
        newErrors.aadhar = "Aadhar number is required";
      } else if (!AADHAR_PATTERN.test(aadhar)) {
        newErrors.aadhar = "Aadhar must be exactly 12 digits";
      } else if (
        aadharStatus === "registered" &&
        allowedDegreeTypeIds &&
        allowedDegreeTypeIds.length === 0
      ) {
        newErrors.aadhar = "";
      }
    }

    /* ── PASSPORT ── */
    if (!isIndian) {
      if (!passport.trim()) {
        newErrors.passport = "Passport number is required";
      } else if (passport.length < 6) {
        newErrors.passport = "Invalid passport number";
      } else if (
        passportStatus === "registered" &&
        allowedDegreeTypeIds &&
        allowedDegreeTypeIds.length === 0
      ) {
        newErrors.passport = "";
      }
    }

    /* ── DEGREE TYPE (all students) ── */
    if (!degreeTypeId) {
      newErrors.degreeType = "Please select the degree you are applying to";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOtp = () => {
    const newErrors: Record<string, string> = {};

    if (!otp.trim()) newErrors.otp = "OTP is required";
    if (!OTP_PATTERN.test(otp)) newErrors.otp = "OTP must be 6 digits";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};

    if (!password) newErrors.password = "Password is required";
    if (password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    if (!UPPERCASE_PATTERN.test(password))
      newErrors.password = "Password must contain uppercase letter";
    if (!DIGIT_PATTERN.test(password))
      newErrors.password = "Password must contain number";

    if (!confirmPassword) newErrors.confirmPassword = "Please confirm password";
    if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateBasicInfo()) return;

    const documentLabel = isIndian ? "Aadhar" : "Passport";
    const identityStatus = isIndian ? aadharStatus : passportStatus;
    const errorKey = isIndian ? "aadhar" : "passport";

    // The Aadhaar/Passport field already ran this exact identity check as
    // soon as it was fully entered (see the auto-check effect and the
    // passport onBlur handler above), and the page already reflects the
    // result: status badge, prefilled details, the "already registered for
    // another program" banner, or the "resuming your registration" state.
    // Reuse that instead of re-fetching here — an earlier version re-ran the
    // same check on every submit, which was both a wasted round trip and a
    // source of a "first click does nothing" bug when it raced a check
    // triggered by the field losing focus right as the button was clicked.

    let resumeUsername: string | null = null;

    if (identityStatus === "registered") {
      const noProgramsLeft = allowedDegreeTypeIds !== null && allowedDegreeTypeIds.length === 0;

      if (noProgramsLeft) {
        setErrors((prev) => ({
          ...prev,
          [errorKey]: `This ${documentLabel} number is already registered. Please login instead.`,
        }));
        setToast({
          message: `This ${documentLabel} number is already registered. Please login instead. Redirecting...`,
          type: "error",
        });
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      // Already registered under this identity, but for a different degree
      // type. The banner under the field already told the user to pick a
      // new username, and validateBasicInfo above already required one.
      if (degreeTypeId && allowedDegreeTypeIds && !allowedDegreeTypeIds.includes(degreeTypeId)) {
        setErrors((prev) => ({
          ...prev,
          degreeType: "You've already registered for this program with this identity. Please choose a different one.",
        }));
        return;
      }
    }

    if (identityStatus === "incomplete" && incompleteResume?.username) {
      // Registration started but never finished (OTP or password step
      // abandoned). Resume that row instead of creating a duplicate one.
      resumeUsername = incompleteResume.username;
    }

    if (!nationalityId) {
      setErrors((prev) => ({
        ...prev,
        nationality: "Please select nationality",
      }));
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        username: (resumeUsername ?? username).trim(),
        name: name.trim(),
        nationalityId,
        mobile: mobile.trim(),
        email: email.trim().toLowerCase(),
        dob: new Date(dob).toISOString(),

        ...(isIndian
          ? { aadharNo: aadhar }
          : { passportNo: passport }),
        ...(existingStudent === "yes" && prevRegNumber.trim()
          ? { usnNo: prevRegNumber.trim() }
          : {}),
        ...(degreeTypeId
          ? { degreeTypeId }
          : {}),
        examRegistration: isExamStudent === "yes",
      };

      // ✅ STEP 1: CREATE OR RESUME REGISTRATION
      if (resumeUsername) {
        await resumeIncompleteRegistration(resumeUsername, payload);
      } else {
        await createRegistration(payload);
      }

      // ✅ STEP 2: SEND OTP
      // resendOtp invalidates any still-valid OTP left over from an earlier
      // abandoned attempt on this username; sendOtp alone would leave that
      // old OTP usable alongside the new one.
      if (resumeUsername) {
        await resendOtp({
          username: payload.username,
          mobile: payload.mobile,
        });
      } else {
        await sendOtp({
          username: payload.username,
          mobile: payload.mobile,
        });
      }

      setStep("otp-verification");
      setErrors({});
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "";
      const lowerMsg = msg.toLowerCase();

      const isDuplicate =
        lowerMsg.includes("already exist") ||
        lowerMsg.includes("already registered") ||
        (lowerMsg.includes("aadhar") && lowerMsg.includes("exist")) ||
        (lowerMsg.includes("passport") && lowerMsg.includes("exist"));

      if (isDuplicate) {
        setToast({
          message: `${msg || "This Aadhar/Passport number is already registered."} Please login instead. Redirecting...`,
          type: "error",
        });
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      setToast({
        message: msg || "Failed to send OTP",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateOtp()) return;

    setIsLoading(true);

    try {
      await verifyOtp({
        username,
        otp,
      });

      setStep("password-setup");
      setErrors({});
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };

      setErrors({
        otp: err.response?.data?.message || "Invalid OTP",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    try {
      await resendOtp({ username, mobile });
      setToast({ message: "OTP resent to your mobile number", type: "success" });
      setResendCooldown(30);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setToast({ message: err.response?.data?.message || "Failed to resend OTP", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validatePassword()) return;

    setIsLoading(true);

    try {
      const registration = await getRegistrationByUsername(username);
      await setUserPassword({
        username,
        password,
        registrationId: registration.id,
        roleId: studentRoleId,
      });

      setStep("success");
      setErrors({});
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };

      setToast({
        message:
          err.response?.data?.message || "Registration failed",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const passwordsMatch = useMemo(
    () =>
      password.length > 0 &&
      confirmPassword.length > 0 &&
      password === confirmPassword,
    [password, confirmPassword]
  );

  // Runs the three regex checks once per password change instead of three
  // times on every render (once per requirement pill below).
  const passwordChecks = useMemo(
    () => ({
      hasMinLength: password.length >= 8,
      hasUppercase: UPPERCASE_PATTERN.test(password),
      hasDigit: DIGIT_PATTERN.test(password),
    }),
    [password]
  );

  return (
    <div className="flex items-center justify-center min-h-screen px-3 py-6 bg-background text-text sm:px-4 sm:py-4">
      {toast && (
        <div className="fixed z-50 -translate-x-1/2 top-6 left-1/2">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}
      <div className="w-full max-w-5xl">
        {/* Admission Type Step */}
        {step === "admission-type" && (
          <div className="p-8 bg-white border-2 border-t-4 border-gray-100 border-t-secondary rounded-2xl sm:p-8">
            <CardHeader />
            {/* Question 1: Existing student */}
            {!(existingStudent === "yes" && usnVerified) && (
              <>
                <div className="mb-8 text-center">
                  <h2 className="mb-2 text-xl font-bold sm:text-2xl text-text">
                    Are you an
                  </h2>
                  <p className="text-2xl font-bold sm:text-3xl text-primary">
                    Existing Student?
                  </p>
                </div>

                <ul className="max-w-md px-4 py-3 mx-auto mb-6 space-y-1.5 text-sm list-disc list-inside border-2 rounded-xl text-amber-700 bg-amber-50 border-amber-200">
                  <li>
                    Select <span className="font-semibold">"Yes"</span> if you have studied here before and have a registration / USN number. It will be verified before you continue.
                  </li>
                  <li>
                    Select <span className="font-semibold">"No"</span> if you are a new student registering for the first time.
                  </li>
                </ul>

                {/* Radio buttons */}
                <div className="flex flex-col justify-center gap-4 mb-8 sm:flex-row">
                  <label
                    className={`relative flex-1 sm:flex-none sm:w-44 py-4 rounded-xl border-2 font-bold text-lg text-center cursor-pointer transition-all duration-200 ${existingStudent === "yes"
                      ? "bg-secondary text-white border-secondary"
                      : "bg-white text-secondary border-secondary/30 hover:border-secondary"
                      }`}
                    data-testid={createTestId("registration", "existing-student-yes")}
                  >
                    {existingStudent === "yes" && (
                      <CheckCircle
                        size={20}
                        className="absolute text-white rounded-full -top-2 -right-2 bg-secondary"
                      />
                    )}
                    <input
                      type="radio"
                      name="existingStudent"
                      value="yes"
                      className="sr-only"
                      checked={existingStudent === "yes"}
                      onChange={() => {
                        setExistingStudent("yes");
                        setPrevRegError("");
                      }}
                    />
                    Yes
                  </label>
                  <label
                    className={`relative flex-1 sm:flex-none sm:w-44 py-4 rounded-xl border-2 font-bold text-lg text-center cursor-pointer transition-all duration-200 ${existingStudent === "no"
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-primary border-primary/30 hover:border-primary"
                      }`}
                    data-testid={createTestId("registration", "existing-student-no")}
                  >
                    {existingStudent === "no" && (
                      <CheckCircle
                        size={20}
                        className="absolute text-white rounded-full -top-2 -right-2 bg-primary"
                      />
                    )}
                    <input
                      type="radio"
                      name="existingStudent"
                      value="no"
                      className="sr-only"
                      checked={existingStudent === "no"}
                      onChange={() => {
                        setExistingStudent("no");
                        setPrevRegNumber("");
                        setPrevRegError("");
                        setUsnVerified(false);
                        setIsExamStudent("");
                      }}
                    />
                    No
                  </label>
                </div>

                {/* USN field — only for "Yes", before verification */}
                {existingStudent === "yes" && (
                  <div className="max-w-sm mx-auto mb-8">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={18} className="flex-shrink-0 text-secondary" />
                      <label className="text-sm font-medium text-text">
                        Registration / USN Number <span className="font-bold text-red-500">*</span>
                      </label>
                    </div>
                    <Input
                      placeholder="Enter your registration number"
                      value={prevRegNumber}
                      onChange={(e) => {
                        setPrevRegNumber(e.target.value);
                        setPrevRegError("");
                      }}
                      error={prevRegError}
                      testId={createTestId("registration", "prev-reg-number-input")}
                    />
                  </div>
                )}
              </>
            )}

            {/* Question 2: 8th Semester Exam Fees — only after USN verified */}
            {existingStudent === "yes" && usnVerified && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setUsnVerified(false);
                    setIsExamStudent("");
                  }}
                  className="flex items-center gap-2 mb-6 text-sm font-semibold transition-colors text-secondary hover:text-primary"
                >
                  <ArrowLeft size={18} />
                  <span>Back</span>
                </button>

                <div className="mb-8 text-center">
                  <h2 className="mb-2 text-xl font-bold sm:text-2xl text-text">
                    Are you paying
                  </h2>
                  <p className="text-2xl font-bold sm:text-3xl text-primary">
                    8th Semester Exam Fees?
                  </p>
                </div>

                <div className="flex flex-col justify-center gap-4 mb-8 sm:flex-row">
                  <label
                    className={`relative flex-1 sm:flex-none sm:w-44 py-4 rounded-xl border-2 font-bold text-lg text-center cursor-pointer transition-all duration-200 ${isExamStudent === "yes"
                      ? "bg-secondary text-white border-secondary"
                      : "bg-white text-secondary border-secondary/30 hover:border-secondary"
                      }`}
                    data-testid={createTestId("registration", "exam-fees-yes")}
                  >
                    {isExamStudent === "yes" && (
                      <CheckCircle
                        size={20}
                        className="absolute text-white rounded-full -top-2 -right-2 bg-secondary"
                      />
                    )}
                    <input
                      type="radio"
                      name="examFees"
                      value="yes"
                      className="sr-only"
                      checked={isExamStudent === "yes"}
                      onChange={() => setIsExamStudent("yes")}
                    />
                    Yes
                  </label>
                  <label
                    className={`relative flex-1 sm:flex-none sm:w-44 py-4 rounded-xl border-2 font-bold text-lg text-center cursor-pointer transition-all duration-200 ${isExamStudent === "no"
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-primary border-primary/30 hover:border-primary"
                      }`}
                    data-testid={createTestId("registration", "exam-fees-no")}
                  >
                    {isExamStudent === "no" && (
                      <CheckCircle
                        size={20}
                        className="absolute text-white rounded-full -top-2 -right-2 bg-primary"
                      />
                    )}
                    <input
                      type="radio"
                      name="examFees"
                      value="no"
                      className="sr-only"
                      checked={isExamStudent === "no"}
                      onChange={() => setIsExamStudent("no")}
                    />
                    No
                  </label>
                </div>
              </>
            )}

            {(existingStudent === "no" ||
              (existingStudent === "yes" && (!usnVerified || isExamStudent))) && (
                <Button
                  variant="secondary"
                  className="block w-full mx-auto sm:w-64"
                  onClick={handleAdmissionTypeContinue}
                  disabled={prevRegChecking}
                  testId={createTestId("registration", "admission-type-continue")}
                >
                  {prevRegChecking ? "Verifying..." : "Continue"}
                </Button>
              )}

            <div className="pt-6 mt-2 text-center border-t border-gray-100">
              <span className="text-md text-text">
                Already have an account?{" "}
              </span>
              <button
                type="button"
                className="font-semibold transition-colors text-md text-primary hover:text-secondary"
                onClick={() => navigate("/login")}
              >
                Login
              </button>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === "success" && (
          <div className="p-8 text-center bg-white border-2 border-t-4 border-gray-100 border-t-secondary rounded-2xl sm:p-12">
            <CardHeader />
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center w-16 h-16 border-2 rounded-full sm:w-20 sm:h-20 border-secondary/20 bg-secondary/5">
                <CheckCircle
                  size={48}
                  className="sm:w-16 sm:h-16 text-secondary"
                />
              </div>
            </div>
            <h2 className="mb-3 text-2xl font-bold sm:text-3xl text-primary">
              Registration Successful!
            </h2>
            <p className="mb-2 text-base text-secondary sm:text-lg">
              Your account has been created successfully.
            </p>
            <p className="mb-8 text-sm text-gray-500 sm:text-base">
              You can now login with your credentials.
            </p>
            <Button
              variant="secondary"
              className="w-full mx-auto sm:w-48"
              onClick={() => navigate("/login")}
              testId={createTestId("registration", "success-go-to-login-button")}
            >
              Go to Login
            </Button>
          </div>
        )}

        {/* Basic Info Step */}
        {step === "basic-info" && (
          <div className="p-6 bg-white border-2 border-t-4 border-gray-100 border-t-secondary rounded-2xl sm:p-10">
            <CardHeader />
            <StepIndicator currentStep={1} />

            <div className="flex items-center justify-center gap-3 mt-12 mb-6">
              <div className="flex items-center justify-center w-10 h-10 border rounded-full border-secondary/20 bg-secondary/5">
                <User size={18} className="text-secondary" />
              </div>

              <div>
                <h2 className="text-lg font-bold leading-tight text-text">
                  Create Your Account
                </h2>
                <p className="text-xs text-secondary">
                  Fill in your basic information to get started
                </p>
              </div>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="flex items-start gap-2 p-4 border-2 border-red-200 rounded-xl bg-red-50">
                <FileText size={18} className="flex-shrink-0 mt-0.5 text-red-600" />
                <div className="text-xs font-medium leading-relaxed text-red-700 sm:text-sm">
                  <p className="mb-1 font-bold">Important — Please Read Before Proceeding</p>
                  <ul className="pl-4 space-y-1 list-disc">
                    <li>
                      The <strong>name entered here must exactly match the name on your Aadhaar / Passport</strong>.
                      Any mismatch may lead to <strong>rejection of your application</strong>.
                    </li>
                    <li>
                      The details you enter on this page <strong>cannot be changed later</strong>. Please
                      double-check everything before submitting.
                    </li>
                  </ul>
                </div>
              </div>

              <p className="pt-1 text-xs font-bold tracking-wider uppercase text-secondary/70">
                Identity Verification
              </p>
              {/* Row 3: Nationality + Aadhaar/Passport */}
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="md:flex-shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={18} className="flex-shrink-0 text-secondary" />
                    <label className="text-sm font-medium text-text">
                      Nationality <span className="font-bold text-red-500">*</span>
                    </label>
                  </div>
                  <div className="inline-flex flex-wrap mt-1 overflow-hidden border-2 rounded-xl border-secondary/30">
                    {nationalityOptions.map((option, index) => (
                      <button
                        key={option.id}
                        type="button"
                        data-testid={createTestId("registration", `nationality-option-${option.code}`)}
                        onClick={() => {
                          setNationality(option.code!);
                          setNationalityName(option.name ?? "");
                          setNationalityId(option.id);
                          setErrors((prev) => ({ ...prev, nationality: "" }));
                        }}
                        className={`px-4 py-2 text-sm font-semibold transition-colors ${index !== 0 ? "border-l-2 border-secondary/30" : ""
                          } ${nationality === option.code
                            ? "bg-secondary text-white"
                            : "bg-white text-secondary hover:bg-secondary/10"
                          }`}
                      >
                        {option.name}
                      </button>
                    ))}
                    {nationalityOptions.length === 0 && (
                      <p className="px-4 py-2 text-sm text-gray-400">Loading nationalities...</p>
                    )}
                  </div>
                  {errors.nationality && (
                    <p className="mt-1 text-xs text-red-500">{errors.nationality}</p>
                  )}
                </div>

                {nationality && (
                  <div className="md:w-64">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={18} className="flex-shrink-0 text-secondary" />
                      <label className="text-sm font-medium text-text">
                        {isIndian ? "Aadhar Number" : "Passport Number"}{" "}
                        <span className="font-bold text-red-500">*</span>
                      </label>
                    </div>

                    {isIndian ? (
                      <Input
                        placeholder="12-digit Aadhar number"
                        value={aadhar}
                        onChange={(e) => {
                          setAadhar(e.target.value.replace(/\D/g, "").slice(0, 12));
                          setErrors((prev) => ({ ...prev, aadhar: "" }));
                          setAadharStatus("available");
                          setAllowedDegreeTypeIds(null);
                        }}
                        error={errors.aadhar}
                        testId={createTestId("registration", "aadhar-input")}
                      />
                    ) : (
                      <Input
                        placeholder="Enter your passport number"
                        value={passport}
                        onChange={(e) => {
                          setPassport(formatPassport(e.target.value));
                          setErrors((prev) => ({ ...prev, passport: "" }));
                          setPassportStatus("available");
                          setAllowedDegreeTypeIds(null);
                        }}
                        onBlur={checkPassportOnBlur}
                        error={errors.passport}
                        testId={createTestId("registration", "passport-input")}
                      />
                    )}
                    {isIndian && aadharChecking && (
                      <p className="mt-1.5 text-[11px] text-gray-500">Checking Aadhar number...</p>
                    )}
                    {isIndian && !aadharChecking && aadharStatus === "registered" && (
                      allowedDegreeTypeIds && allowedDegreeTypeIds.length === 0 ? (
                        <p className="mt-1.5 text-[11px] font-medium text-red-600">
                          This Aadhar number is already registered.{" "}
                          <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="underline hover:text-red-700"
                          >
                            Click here to login
                          </button>
                        </p>
                      ) : (
                        <p className="mt-1.5 text-[11px] font-medium text-amber-600">
                          This Aadhar number is already registered for another program. We've filled in your details below — just pick a new username to register for a new program.
                        </p>
                      )
                    )}
                    {isIndian && !aadharChecking && aadharStatus === "incomplete" && (
                      <p className="mt-1.5 text-[11px] font-medium text-amber-600">
                        We found an unfinished registration and filled in your details below. Just review and continue.
                      </p>
                    )}
                    {!isIndian && passportChecking && (
                      <p className="mt-1.5 text-[11px] text-gray-500">Checking Passport number...</p>
                    )}
                    {!isIndian && !passportChecking && passportStatus === "registered" && (
                      allowedDegreeTypeIds && allowedDegreeTypeIds.length === 0 ? (
                        <p className="mt-1.5 text-[11px] font-medium text-red-600">
                          This Passport number is already registered.{" "}
                          <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="underline hover:text-red-700"
                          >
                            Click here to login
                          </button>
                        </p>
                      ) : (
                        <p className="mt-1.5 text-[11px] font-medium text-amber-600">
                          This Passport number is already registered for another program. We've filled in your details below — just pick a new username to register for a new program.
                        </p>
                      )
                    )}
                    {!isIndian && !passportChecking && passportStatus === "incomplete" && (
                      <p className="mt-1.5 text-[11px] font-medium text-amber-600">
                        We found an unfinished registration and filled in your details below. You don't need to remember your old username — just review and continue.
                      </p>
                    )}
                    {(isIndian ? aadharStatus : passportStatus) === "available" && (
                      <p className="mt-1.5 text-[11px] leading-snug text-red-600">
                        Enter the number exactly as it appears on your {isIndian ? "Aadhaar" : "Passport"}.
                        This cannot be edited after registration.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Row: Degree Type — right after Aadhar/Passport so the
                  auto-filled selection is visible immediately, next to the
                  field that caused it, instead of scrolled past below
                  Personal Details / Contact Details. */}
              {nationality && (
                <div>
                  <p className="pb-1 text-xs font-bold tracking-wider uppercase text-secondary/70">
                    Program Selection
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={18} className="flex-shrink-0 text-secondary" />
                    <label className="text-sm font-medium text-text">
                      Which degree are you applying to? <span className="font-bold text-red-500">*</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {(allowedDegreeTypeIds
                      ? degreeTypeOptions.filter(
                        (option) => allowedDegreeTypeIds.includes(option.id) || option.id === degreeTypeId
                      )
                      : degreeTypeOptions
                    ).map((option) => {
                      const isLockedResumedSelection =
                        degreeTypeId === option.id &&
                        !!allowedDegreeTypeIds &&
                        !allowedDegreeTypeIds.includes(option.id);

                      return (
                        <label
                          key={option.id}
                          className={`relative flex items-center justify-center text-center px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${degreeTypeId === option.id
                            ? "bg-secondary text-white border-secondary"
                            : "bg-white text-secondary border-secondary/30 hover:border-secondary"
                            } ${isLockedResumedSelection ? "cursor-default opacity-90" : "cursor-pointer"}`}
                          data-testid={createTestId("registration", `degree-type-option-${option.code ?? option.id}`)}
                        >
                          {degreeTypeId === option.id && (
                            <CheckCircle
                              size={18}
                              className="absolute text-white rounded-full -top-2 -right-2 bg-secondary"
                            />
                          )}
                          <input
                            type="radio"
                            name="degreeType"
                            value={option.id}
                            className="sr-only"
                            checked={degreeTypeId === option.id}
                            disabled={isLockedResumedSelection}
                            onChange={() => {
                              // Don't commit yet — ask for confirmation first,
                              // since this can't be changed after applying.
                              setPendingDegreeType(option);
                            }}
                          />
                          {option.name}
                        </label>
                      );
                    })}
                    {degreeTypeOptions.length === 0 && (
                      <p className="text-sm text-gray-400">Loading degree types...</p>
                    )}
                    {degreeTypeOptions.length > 0 &&
                      allowedDegreeTypeIds &&
                      allowedDegreeTypeIds.length === 0 && (
                        <p className="text-sm text-red-500">
                          You've already registered for every available program with this {isIndian ? "Aadhar" : "Passport"} number.
                        </p>
                      )}
                  </div>
                  {errors.degreeType && (
                    <p className="mt-1 text-xs text-red-500">{errors.degreeType}</p>
                  )}
                </div>
              )}

              <p className="text-xs font-bold tracking-wider uppercase text-secondary/70">
                Personal Details
              </p>
              {/* Row 1: Full Name, Username */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User size={18} className="flex-shrink-0 text-secondary" />
                    <label className="text-sm font-medium text-text">
                      Full Name <span className="font-bold text-red-500">*</span>
                    </label>
                  </div>
                  <Input
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => {
                      setName(formatFullName(e.target.value));
                      setErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    error={errors.name}
                    disabled={existingStudent === "yes"}
                    testId={createTestId("registration", "name-input")}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User size={18} className="flex-shrink-0 text-secondary" />
                    <label className="text-sm font-medium text-text">
                      Username <span className="font-bold text-red-500">*</span>
                    </label>
                  </div>
                  <Input
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => {
                      const next = formatUsername(e.target.value);
                      setUsername(next);
                      setErrors((prev) => ({ ...prev, username: "" }));
                      setUsernameStatus("idle");
                      // Note: degreeTypeId is tied to the Aadhaar/Passport
                      // identity (set in the Aadhaar auto-check effect / checkPassportOnBlur),
                      // not to whatever username is typed here — submit time
                      // (handleSendOtp) independently re-derives the correct
                      // resumeUsername from the server. Don't clear it just
                      // because the typed username differs from the old one.
                    }}
                    onBlur={checkUsernameOnBlur}
                    error={errors.username}
                    disabled={incompleteResume?.username === username && usernameStatus === "available"}
                    testId={createTestId("registration", "username-input")}
                  />
                  {usernameChecking && (
                    <p className="mt-1.5 text-[11px] text-gray-500">Checking username...</p>
                  )}
                  {!usernameChecking && usernameStatus === "taken" && (
                    <p className="mt-1.5 text-[11px] font-medium text-red-600">
                      This username is not available. Please try another one.
                    </p>
                  )}
                  {!usernameChecking &&
                    usernameStatus === "available" &&
                    (incompleteResume?.username === username ? (
                      <p className="mt-1.5 text-[11px] font-medium text-amber-600">
                        Continuing your previous registration under this username.
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[11px] font-medium text-green-600">
                        Username is available.
                      </p>
                    ))}
                </div>
              </div>

              {/* Row 2: Email, Mobile, Date of Birth */}
              <p className="pt-1 text-xs font-bold tracking-wider uppercase text-secondary/70">
                Contact Details
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail size={18} className="flex-shrink-0 text-secondary" />
                    <label className="text-sm font-medium text-text">
                      Email <span className="font-bold text-red-500">*</span>
                    </label>
                  </div>
                  <Input
                    placeholder="your.email@university.edu"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(formatEmail(e.target.value));
                      setErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    error={errors.email}
                    testId={createTestId("registration", "email-input")}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Phone size={18} className="flex-shrink-0 text-secondary" />
                    <label className="text-sm font-medium text-text">
                      Mobile Number <span className="font-bold text-red-500">*</span>
                    </label>
                  </div>
                  <Input
                    placeholder="10-digit number"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setErrors((prev) => ({ ...prev, mobile: "" }));
                    }}
                    error={errors.mobile}
                    testId={createTestId("registration", "mobile-input")}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar
                      size={18}
                      className="flex-shrink-0 text-secondary"
                    />
                    <label className="text-sm font-medium text-text">
                      Date of Birth <span className="font-bold text-red-500">*</span>
                    </label>
                  </div>
                  <Input
                    type="date"
                    value={dob}
                    onChange={(e) => {
                      setDob(e.target.value);
                      setErrors((prev) => ({ ...prev, dob: "" }));
                    }}
                    error={errors.dob}
                    testId={createTestId("registration", "dob-input")}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3 pt-4 sm:flex-row">
                {/* Send OTP */}
                <Button
                  type="submit"
                  variant="secondary"
                  className="flex-1 w-full sm:w-auto"
                  disabled={isLoading}
                  testId={createTestId("registration", "send-otp-button")}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2 text-sm">
                      <span className="animate-spin">⏳</span>
                      Sending OTP...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2 text-sm">
                      <Send size={16} />
                      Send OTP
                    </span>
                  )}
                </Button>

                {/* Login */}
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 w-full text-sm sm:w-auto"
                  onClick={() => navigate("/login")}
                  testId={createTestId("registration", "login-link")}
                >
                  Already have an account? Login
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* OTP Verification Step */}
        {step === "otp-verification" && (
          <div className="p-6 bg-white border-2 border-t-4 border-gray-100 border-t-secondary rounded-2xl sm:p-10">
            <CardHeader />
            <StepIndicator currentStep={2} />

            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <button
                onClick={() => {
                  setStep("basic-info");
                  setOtp("");
                }}
                className="flex items-center gap-2 text-sm font-semibold transition-colors text-secondary hover:text-primary sm:text-base"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 border-2 rounded-full border-secondary/20 bg-secondary/5">
                <Phone size={22} className="text-secondary" />
              </div>

              <h2 className="text-2xl font-bold sm:text-3xl text-text">
                Verify Your OTP
              </h2>
            </div>
            <p className="mb-8 text-sm text-center text-secondary sm:text-base sm:mb-10">
              We've sent a 6-digit OTP to
              <br />
              <span className="text-xs font-bold text-primary sm:text-sm">
                {mobile || "your mobile number"}
              </span>
            </p>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <p className="mb-3 text-xs font-bold tracking-wider text-center uppercase text-secondary/70">
                  Enter OTP
                </p>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={otp[index] || ""}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      data-testid={createTestId("registration", `otp-digit-${index}`)}
                      className={`w-11 h-12 sm:w-14 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 outline-none transition-colors ${errors.otp
                        ? "border-red-400 text-red-600"
                        : otp[index]
                          ? "border-secondary text-secondary bg-secondary/5"
                          : "border-gray-200 text-text focus:border-secondary"
                        } disabled:bg-gray-50 disabled:cursor-not-allowed`}
                    />
                  ))}
                </div>
                {errors.otp && (
                  <p className="mt-2 text-xs text-center text-red-500">{errors.otp}</p>
                )}
              </div>

              {/* Info Box */}
              <div className="p-3 text-center border-2 rounded-xl sm:p-4 bg-accent/10 border-accent/30">
                <p className="text-xs sm:text-sm text-text">
                  OTP expires in 10 minutes. Please check the SMS inbox on your registered mobile number.
                </p>
              </div>

              {/* Verify Button */}
              <Button
                type="submit"
                variant="secondary"
                className="block w-full mx-auto sm:w-64"
                disabled={isLoading}
                testId={createTestId("registration", "verify-otp-button")}
              >
                {isLoading ? "Verifying OTP..." : "Verify OTP"}
              </Button>

              {/* Resend OTP */}
              <div className="pt-4 text-center border-t border-gray-200">
                <p className="text-sm text-secondary">
                  Didn't receive OTP?{" "}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading}
                    className="font-bold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
                  </button>
                </p>
              </div>
            </form>
          </div>
        )}

        {/* Password Setup Step */}
        {step === "password-setup" && (
          <div className="p-6 bg-white border-2 border-t-4 border-gray-100 border-t-secondary rounded-2xl sm:p-10">
            <CardHeader />
            <StepIndicator currentStep={3} />

            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <button
                onClick={() => setStep("otp-verification")}
                className="flex items-center gap-2 text-sm font-semibold transition-colors text-secondary hover:text-primary sm:text-base"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-8">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Left Column - Password Requirements */}
                <div className="order-2 lg:order-1">
                  <div className="p-5 border-2 rounded-xl bg-secondary/5 border-secondary/20">
                    <p className="mb-4 text-sm font-bold tracking-wider uppercase text-secondary">
                      Password Requirements
                    </p>

                    <div className="space-y-3">
                      <div
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${passwordChecks.hasMinLength
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary/60 border-secondary/20"
                          }`}
                      >
                        <CheckCircle size={18} />
                        <span className="text-sm font-medium">
                          Minimum 8 characters
                        </span>
                      </div>

                      <div
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${passwordChecks.hasUppercase
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary/60 border-secondary/20"
                          }`}
                      >
                        <CheckCircle size={18} />
                        <span className="text-sm font-medium">
                          At least one uppercase letter
                        </span>
                      </div>

                      <div
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${passwordChecks.hasDigit
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary/60 border-secondary/20"
                          }`}
                      >
                        <CheckCircle size={18} />
                        <span className="text-sm font-medium">
                          At least one number
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Password Fields */}
                <div className="order-1 space-y-5 lg:order-2">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lock size={18} className="flex-shrink-0 text-secondary" />
                      <label className="text-sm font-medium text-text">
                        New Password <span className="font-bold text-red-500">*</span>
                      </label>
                    </div>

                    <div className="relative">
                      <Input
                        placeholder="Enter new password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setErrors((prev) => ({ ...prev, password: "" }));
                        }}
                        error={errors.password}
                        testId={createTestId("registration", "new-password-input")}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute transition-colors -translate-y-1/2 right-4 top-1/2 text-secondary hover:text-primary"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lock size={18} className="flex-shrink-0 text-secondary" />
                      <label className="text-sm font-medium text-text">
                        Confirm Password <span className="font-bold text-red-500">*</span>
                      </label>
                    </div>

                    <div className="relative">
                      <Input
                        placeholder="Confirm password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);

                          // Clear error while typing
                          setErrors((prev) => ({
                            ...prev,
                            confirmPassword: "",
                          }));
                        }}
                        error={errors.confirmPassword}
                        testId={createTestId(
                          "registration",
                          "confirm-password-input"
                        )}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute transition-colors -translate-y-1/2 right-4 top-1/2 text-secondary hover:text-primary"
                        data-testid={createTestId(
                          "registration",
                          "toggle-confirm-password-visibility"
                        )}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    {/* Real-time Password Match Status */}
                    {confirmPassword.length > 0 && (
                      <div
                        className={`mt-2 flex items-center gap-2 text-sm font-medium ${passwordsMatch
                          ? "text-green-600"
                          : "text-red-500"
                          }`}
                      >
                        {passwordsMatch ? (
                          <>
                            <CheckCircle size={16} />
                            Passwords match
                          </>
                        ) : (
                          <>
                            <XCircle size={16} />
                            Passwords do not match
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Register Button */}
              <Button
                type="submit"
                variant="secondary"
                className="block w-full mx-auto sm:w-64"
                disabled={isLoading}
                testId={createTestId("registration", "complete-registration-button")}
              >
                {isLoading
                  ? "Completing Registration..."
                  : "Complete Registration"}
              </Button>

            </form>
          </div>
        )}

        {/* Footer */}
        <div className="mt-2 text-xs text-center sm:mt-6 sm:text-sm text-secondary">
          <p>
            MGRDPR University © {new Date().getFullYear()} |{" "}
            <a
              href="#"
              className="font-medium transition-colors hover:text-primary"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>

      {/* Degree Type Confirmation Modal */}
      {pendingDegreeType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl"
            role="dialog"
            aria-modal="true"
            data-testid={createTestId("registration", "degree-type-confirm-modal")}
          >
            <div className="flex items-center gap-2 mb-3 text-secondary">
              <FileText size={20} />
              <h3 className="text-base font-bold">Confirm Program Selection</h3>
            </div>

            <p className="mb-3 text-sm text-text">
              You have selected{" "}
              <span className="font-semibold text-secondary">
                {pendingDegreeType.name}
              </span>
              . Are you sure you want to apply for this program?
            </p>

            <p className="px-3 py-2 mb-5 text-xs font-medium leading-snug text-red-600 border border-red-200 rounded-lg bg-red-50">
              Once you apply, this selection cannot be modified.
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setPendingDegreeType(null)}
                testId={createTestId("registration", "degree-type-confirm-cancel")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setDegreeTypeId(pendingDegreeType.id);
                  setErrors((prev) => ({ ...prev, degreeType: "" }));
                  setPendingDegreeType(null);
                }}
                testId={createTestId("registration", "degree-type-confirm-yes")}
              >
                Yes, Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}