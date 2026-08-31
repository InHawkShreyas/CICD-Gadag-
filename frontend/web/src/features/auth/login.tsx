import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff, XCircle, ArrowLeft, CheckCircle, KeyRound, LogIn, IdCard, Smartphone, ShieldCheck } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Toast from "../../components/ui/Toast";
import { createTestId } from "../../utils/testId";
import { login, resetPassword, sendUsernameOtp, resendUsernameOtp, verifyUsernameOtp } from "../../services/loginService";
import { getRegistrationByUsername } from "../../services/registrationService";
import { getLookupsByType } from "../../services/lookupService";
import { useAuth } from "../../context/AuthContext";

type ForgotStep = "username" | "reset" | "success";
type ForgotUsernameStep = "identity" | "otp" | "success";

export default function Login() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  // Strips all whitespace (no spaces allowed in a username) and capitalizes
  // just the first letter, leaving the rest of what the person typed as-is.
  // Matches the formatting used on the registration page.
  const formatUsername = (value: string) => {
    const noSpaces = value.replace(/\s/g, "");
    if (!noSpaces) return noSpaces;
    return noSpaces.charAt(0).toUpperCase() + noSpaces.slice(1);
  };

  // Login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Forgot Password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("username");
  const [forgotUsername, setForgotUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot Username
  const [showForgotUsername, setShowForgotUsername] = useState(false);
  const [forgotUsernameStep, setForgotUsernameStep] = useState<ForgotUsernameStep>("identity");
  const [fuIdType, setFuIdType] = useState<"aadhaar" | "passport">("aadhaar");
  const [fuAadharNo, setFuAadharNo] = useState("");
  const [fuPassportNo, setFuPassportNo] = useState("");
  const [fuMobile, setFuMobile] = useState("");
  const [fuOtp, setFuOtp] = useState("");
  const [fuUsername, setFuUsername] = useState("");
  const [fuResendCooldown, setFuResendCooldown] = useState(0);

  // Countdown for the "Resend OTP" button
  useEffect(() => {
    if (fuResendCooldown <= 0) return;
    const timer = setTimeout(() => setFuResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [fuResendCooldown]);

  // Auto-hide the toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ─── Login ───────────────────────────────────────────────────────────────

  const validateLogin = () => {
    const newErrors: Record<string, string> = {};
    if (!username.trim()) newErrors.username = "Username is required";
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault();

    if (!validateLogin()) return;

    setIsLoading(true);

    try {

      const result = await login({

        username: username.trim(),

        password, // ❗ DO NOT trim password

      });

      if (result?.success && result?.token && result?.roleId) {

        // 🔍 Fetch role

        const roles = await getLookupsByType("Role");

        const role = roles.find((r) => r.id === result.roleId);

        const roleName = role?.name?.toLowerCase() ?? "";

        // ✅ Store token/username/role via AuthContext (single source of truth,
        // also attaches the token to axios and persists to localStorage)

        authLogin(result.token, result.username ?? username.trim(), roleName);

        // 🚀 Redirect based on role

        if (roleName === "student") {

          const reg = await getRegistrationByUsername(result.username ?? username.trim()).catch(() => null);

          if (reg?.examRegistration) {
            navigate("/student/exam-application");
          } else {
            navigate("/student");
          }

        } else {

          navigate("/admin/dashboard");

        }

      } else {

        console.warn("LOGIN FAILED RESPONSE:", result);

        setErrors({ password: "Invalid username or password" });

      }

    } catch (error: unknown) {

      console.error("LOGIN ERROR ❌", error);

      setErrors({

        password:

          (error as any)?.response?.data?.message ||

          "Invalid username or password",

      });

    } finally {

      setIsLoading(false);

    }

  };
  // ─── Forgot Password ──────────────────────────────────────────────────────

  const handleCheckUsername = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!forgotUsername.trim()) {
      setErrors({ forgotUsername: "Username is required" });
      return;
    }

    setIsLoading(true);
    try {
      await getRegistrationByUsername(forgotUsername.trim());
      setErrors({});
      setForgotStep("reset");
    } catch {
      setErrors({ forgotUsername: "No account found with this username" });
    } finally {
      setIsLoading(false);
    }
  };

  const validateNewPassword = () => {
    const newErrors: Record<string, string> = {};
    if (!newPassword) newErrors.newPassword = "Password is required";
    if (newPassword.length < 8)
      newErrors.newPassword = "Password must be at least 8 characters";
    if (!/[A-Z]/.test(newPassword))
      newErrors.newPassword = "Password must contain uppercase letter";
    if (!/[0-9]/.test(newPassword))
      newErrors.newPassword = "Password must contain a number";
    if (!confirmPassword) newErrors.confirmPassword = "Please confirm password";
    if (newPassword !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateNewPassword()) return;

    setIsLoading(true);
    try {
      await resetPassword({ username: forgotUsername.trim(), newPassword });
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      setForgotStep("success");
    } catch {
      setToast({
        message: "Failed to reset password. Please try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackFromForgot = () => {
    setShowForgotPassword(false);
    setForgotStep("username");
    setForgotUsername("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
  };

  // ─── Forgot Username ──────────────────────────────────────────────────────

  const maskMobile = (mobile: string) =>
    mobile.length >= 4 ? `••••••${mobile.slice(-4)}` : mobile;

  const validateFuIdentity = () => {
    const newErrors: Record<string, string> = {};
    if (fuIdType === "aadhaar") {
      if (!fuAadharNo.trim()) {
        newErrors.fuAadharNo = "Aadhaar number is required";
      } else if (!/^\d{12}$/.test(fuAadharNo.trim())) {
        newErrors.fuAadharNo = "Enter a valid 12-digit Aadhaar number";
      }
    } else {
      if (!fuPassportNo.trim()) {
        newErrors.fuPassportNo = "Passport number is required";
      } else if (!/^[A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9]$/.test(fuPassportNo.trim())) {
        newErrors.fuPassportNo = "Enter a valid passport number";
      }
    }
    if (!fuMobile.trim()) {
      newErrors.fuMobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(fuMobile.trim())) {
      newErrors.fuMobile = "Enter a valid 10-digit mobile number";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendUsernameOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateFuIdentity()) return;

    setIsLoading(true);
    try {
      const result = await sendUsernameOtp({
        idType: fuIdType,
        idNumber: (fuIdType === "aadhaar" ? fuAadharNo : fuPassportNo).trim(),
        mobile: fuMobile.trim(),
      });

      if (result.success) {
        setErrors({});
        setFuOtp("");
        setForgotUsernameStep("otp");
        setFuResendCooldown(30);
        setToast({
          message: result.message || "OTP sent to your mobile number.",
          type: "success",
        });
      } else {
        setErrors({
          fuMobile:
            result.message ||
            "No account found with this Aadhaar number and mobile number",
        });
      }
    } catch {
      setErrors({ fuMobile: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendUsernameOtp = async () => {
    if (fuResendCooldown > 0 || isLoading) return;

    setIsLoading(true);
    try {
      const result = await resendUsernameOtp({
        idType: fuIdType,
        idNumber: (fuIdType === "aadhaar" ? fuAadharNo : fuPassportNo).trim(),
        mobile: fuMobile.trim(),
      });
      setToast({
        message: result.message || "OTP resent to your mobile number.",
        type: result.success ? "success" : "error",
      });
      if (result.success) setFuResendCooldown(30);
    } catch {
      setToast({ message: "Failed to resend OTP. Please try again.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyUsernameOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fuOtp.trim() || !/^\d{6}$/.test(fuOtp.trim())) {
      setErrors({ fuOtp: "Enter the 6-digit OTP" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyUsernameOtp({
        idType: fuIdType,
        idNumber: (fuIdType === "aadhaar" ? fuAadharNo : fuPassportNo).trim(),
        mobile: fuMobile.trim(),
        otp: fuOtp.trim(),
      });

      if (result.success && result.username) {
        setFuUsername(result.username);
        setErrors({});
        setForgotUsernameStep("success");
      } else {
        setErrors({ fuOtp: result.message || "Invalid or expired OTP" });
      }
    } catch {
      setErrors({ fuOtp: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackFromForgotUsername = () => {
    setShowForgotUsername(false);
    setForgotUsernameStep("identity");
    setFuIdType("aadhaar");
    setFuAadharNo("");
    setFuPassportNo("");
    setFuMobile("");
    setFuOtp("");
    setFuUsername("");
    setFuResendCooldown(0);
    setErrors({});
  };

  // Jump straight into "Forgot Password" with the just-recovered username prefilled
  const handleResetPasswordFromUsername = () => {
    setForgotUsername(fuUsername);
    handleBackFromForgotUsername();
    setForgotStep("username");
    setShowForgotPassword(true);
  };

  // Card Header — logo + title, shown inside every card
  const CardHeader = () => (
    <div className="pb-5 mb-6 border-b border-gray-100 sm:pb-6 sm:mb-8">
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <img
          src="/logo2.png"
          alt="University Logo"
          className="flex-shrink-0 object-contain w-12 h-12 sm:w-14 sm:h-14"
        />
        <h1 className="text-lg font-bold leading-tight sm:text-lg text-primary">
          Mahatma Gandhi Rural Development and Panchayat Raj University, Gadag
        </h1>
      </div>
      <p className="mt-2 text-xs font-bold tracking-widest text-center uppercase sm:text-sm text-secondary">
        STUDENT PORTAL
      </p>
    </div>
  );

  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 py-10 overflow-hidden bg-background">
      {/* Decorative background accents */}
      <div className="absolute rounded-full pointer-events-none -top-24 -right-24 w-72 h-72 bg-secondary/10 blur-3xl" />
      <div className="absolute rounded-full pointer-events-none -bottom-24 -left-24 w-72 h-72 bg-primary/10 blur-3xl" />

      {toast && (
        <div className="fixed z-50 -translate-x-1/2 top-6 left-1/2">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}

      <div className="relative z-10 w-full max-w-xl">
        {!showForgotPassword && !showForgotUsername ? (
          // ═══════════════════ LOGIN ═══════════════════
          <div className="p-6 bg-white border-2 border-t-4 border-gray-100 shadow-xl border-t-secondary rounded-2xl sm:p-10">
            <CardHeader />
            <div className="flex flex-col items-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 border-2 rounded-full border-secondary/20 bg-secondary/5">
                  <User size={26} className="text-secondary" />
                </div>

                <h2 className="text-2xl font-bold sm:text-2xl text-text">
                  Welcome Back
                </h2>
              </div>
              <p className="mt-1 text-sm font-semibold text-center text-secondary sm:text-base">
                Sign in to continue to your account
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Username */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User size={18} className="flex-shrink-0 text-secondary" />
                    <label className="text-sm font-medium text-text">Username</label>
                  </div>
                  <Input
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => {
                      setUsername(formatUsername(e.target.value));
                      setErrors((prev) => ({ ...prev, username: "" }));
                    }}
                    error={errors.username}
                    testId={createTestId("login", "username-input")}
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lock size={18} className="flex-shrink-0 text-secondary" />
                    <label className="text-sm font-medium text-text">Password</label>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, password: "" }));
                      }}
                      error={errors.password}
                      autoComplete="current-password"
                      testId={createTestId("login", "password-input")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute transition-colors -translate-y-1/2 right-4 top-1/2 text-secondary hover:text-primary"
                      data-testid={createTestId("login", "toggle-password-visibility")}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Forgot */}
              <div className="flex items-center justify-end gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowForgotUsername(true)}
                  className="text-sm font-semibold transition-colors text-secondary hover:text-primary"
                  data-testid={createTestId("login", "forgot-username-link")}
                >
                  Forgot Username?
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm font-semibold transition-colors text-secondary hover:text-primary"
                  data-testid={createTestId("login", "forgot-password-link")}
                >
                  Forgot Password?
                </button>
              </div>

              <Button
                type="submit"
                variant="secondary"
                className="block w-full mx-auto sm:w-64"
                disabled={isLoading}
                testId={createTestId("login", "sign-in-button")}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {!isLoading && <LogIn size={18} />}
                  {isLoading ? "Signing In..." : "Sign In"}
                </span>
              </Button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="px-3 py-1 text-xs font-bold tracking-wider uppercase rounded-full text-secondary/70 bg-secondary/5">
                OR
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="text-sm text-center text-secondary">
              New user?{" "}
              <button
                onClick={() => navigate("/Registration")}
                className="font-bold text-primary hover:underline"
                data-testid={createTestId("login", "signup-link")}
              >
                Sign up
              </button>
            </div>

            <Button
              variant="outline"
              className="block w-full mx-auto mt-5 sm:w-64"
              onClick={() => navigate("/")}
              testId={createTestId("login", "back-to-home-button")}
            >
              Back to Home
            </Button>
          </div>
        ) : showForgotPassword ? (
          // ═══════════════════ FORGOT PASSWORD ═══════════════════
          <div className="p-6 bg-white border-2 border-t-4 border-gray-100 shadow-xl border-t-secondary rounded-2xl sm:p-10">
            <CardHeader />
            {forgotStep !== "success" && (
              <div className="flex items-center gap-3">
                <button
                  onClick={
                    forgotStep === "reset"
                      ? () => setForgotStep("username")
                      : handleBackFromForgot
                  }
                  className="flex items-center gap-2 text-sm font-semibold transition-colors text-secondary hover:text-primary sm:text-base"
                  data-testid={createTestId("forgot-password", "back-button")}
                >
                  <ArrowLeft size={18} />
                  <span>Back</span>
                </button>
              </div>
            )}

            {forgotStep !== "success" && (
              <div className="flex flex-col items-center mb-6 sm:mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 border-2 rounded-full border-secondary/20 bg-secondary/5">
                    {forgotStep === "username" ? (
                      <User size={26} className="text-secondary" />
                    ) : (
                      <KeyRound size={26} className="text-secondary" />
                    )}
                  </div>

                  <h2 className="text-2xl font-bold sm:text-2xl text-text">
                    Reset Password
                  </h2>
                </div>

                <p className="mt-1 text-sm font-semibold text-center text-secondary sm:text-base">
                  {forgotStep === "username"
                    ? "Verify your account to continue"
                    : "Choose a new password for your account"}
                </p>
              </div>
            )}

            {/* STEP 1 — Enter username */}
            {forgotStep === "username" && (
              <form onSubmit={handleCheckUsername} className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User size={18} className="flex-shrink-0 text-secondary" />
                    <label className="text-sm font-medium text-text">Username</label>
                  </div>
                  <Input
                    placeholder="Enter your username"
                    value={forgotUsername}
                    onChange={(e) => {
                      setForgotUsername(formatUsername(e.target.value));
                      setErrors((prev) => ({ ...prev, forgotUsername: "" }));
                    }}
                    error={errors.forgotUsername}
                    testId={createTestId("forgot-password", "username-input")}
                  />
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  className="block w-full mx-auto sm:w-64"
                  disabled={isLoading}
                  testId={createTestId(
                    "forgot-password",
                    "check-username-button",
                  )}
                >
                  {isLoading ? "Verifying..." : "Continue"}
                </Button>
              </form>
            )}

            {/* STEP 2 — Set new password */}
            {forgotStep === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <p className="mb-2 text-sm text-center text-secondary">
                  Set a new password for{" "}
                  <span className="font-bold text-primary">
                    {forgotUsername}
                  </span>
                </p>

                {/* New Password */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  {/* Left - Password Requirements */}
                  <div className="p-4 border rounded-xl bg-secondary/5 border-secondary/20">
                    <p className="mb-3 text-sm font-semibold text-secondary">
                      Password Requirements
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${newPassword.length >= 8
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-secondary/70 border-secondary/20"
                          }`}
                      >
                        {newPassword.length >= 8 ? (
                          <CheckCircle size={14} />
                        ) : (
                          <XCircle size={14} />
                        )}
                        8+ characters
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${/[A-Z]/.test(newPassword)
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-secondary/70 border-secondary/20"
                          }`}
                      >
                        {/[A-Z]/.test(newPassword) ? (
                          <CheckCircle size={14} />
                        ) : (
                          <XCircle size={14} />
                        )}
                        Uppercase letter
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${/[0-9]/.test(newPassword)
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-secondary/70 border-secondary/20"
                          }`}
                      >
                        {/[0-9]/.test(newPassword) ? (
                          <CheckCircle size={14} />
                        ) : (
                          <XCircle size={14} />
                        )}
                        Number
                      </span>
                    </div>
                  </div>

                  {/* Right - Password Fields */}
                  <div className="order-1 space-y-5 lg:order-2">
                    {/* New Password */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Lock size={18} className="flex-shrink-0 text-secondary" />
                        <label className="text-sm font-medium text-text">
                          New Password
                        </label>
                      </div>

                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            setErrors((prev) => ({
                              ...prev,
                              newPassword: "",
                            }));
                          }}
                          error={errors.newPassword}
                          testId={createTestId(
                            "forgot-password",
                            "new-password-input"
                          )}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowNewPassword(!showNewPassword)
                          }
                          className="absolute transition-colors -translate-y-1/2 right-4 top-1/2 text-secondary hover:text-primary"
                        >
                          {showNewPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Lock size={18} className="flex-shrink-0 text-secondary" />
                        <label className="text-sm font-medium text-text">
                          Confirm Password
                        </label>
                      </div>

                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setErrors((prev) => ({
                              ...prev,
                              confirmPassword: "",
                            }));
                          }}
                          error={errors.confirmPassword}
                          testId={createTestId(
                            "forgot-password",
                            "confirm-password-input"
                          )}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute transition-colors -translate-y-1/2 right-4 top-1/2 text-secondary hover:text-primary"
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>

                      {/* Real-time Password Match */}
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

                <Button
                  type="submit"
                  variant="secondary"
                  className="block w-full mx-auto sm:w-64"
                  disabled={isLoading}
                  testId={createTestId(
                    "forgot-password",
                    "reset-password-button",
                  )}
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            )}

            {/* STEP 3 — Success */}
            {forgotStep === "success" && (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="flex items-center justify-center w-16 h-16 mb-4 border-2 rounded-full border-secondary/20 bg-secondary/5">
                  <CheckCircle size={32} className="text-secondary" />
                </div>
                <h2 className="text-2xl font-bold sm:text-3xl text-text">
                  Password Reset Successful
                </h2>
                <p className="mt-2 text-sm text-secondary sm:text-base">
                  Your password has been changed. You can now sign in with your new password.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="block w-full mx-auto mt-6 sm:w-64"
                  onClick={handleBackFromForgot}
                  testId={createTestId("forgot-password", "back-to-login-button")}
                >
                  Back to Login
                </Button>
              </div>
            )}
          </div>
        ) : (
          // ═══════════════════ FORGOT USERNAME ═══════════════════
          <div className="p-6 bg-white border-2 border-t-4 border-gray-100 shadow-xl border-t-secondary rounded-2xl sm:p-10">
            <CardHeader />

            {forgotUsernameStep !== "success" && (
              <div className="flex items-center gap-3">
                <button
                  onClick={
                    forgotUsernameStep === "otp"
                      ? () => {
                          setForgotUsernameStep("identity");
                          setFuOtp("");
                          setErrors({});
                        }
                      : handleBackFromForgotUsername
                  }
                  className="flex items-center gap-2 text-sm font-semibold transition-colors text-secondary hover:text-primary sm:text-base"
                  data-testid={createTestId("forgot-username", "back-button")}
                >
                  <ArrowLeft size={18} />
                  <span>Back</span>
                </button>
              </div>
            )}

            {forgotUsernameStep !== "success" && (
              <div className="flex flex-col items-center mb-6 sm:mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 border-2 rounded-full border-secondary/20 bg-secondary/5">
                    {forgotUsernameStep === "identity" ? (
                      <IdCard size={26} className="text-secondary" />
                    ) : (
                      <ShieldCheck size={26} className="text-secondary" />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold sm:text-2xl text-text">
                    Forgot Username
                  </h2>
                </div>
                <p className="mt-1 text-sm font-semibold text-center text-secondary sm:text-base">
                  {forgotUsernameStep === "identity"
                    ? "Verify your identity to continue"
                    : `Enter the OTP sent to ${maskMobile(fuMobile.trim())}`}
                </p>
              </div>
            )}

            {/* STEP 1 — Aadhaar + Mobile */}
            {forgotUsernameStep === "identity" && (
              <form onSubmit={handleSendUsernameOtp} className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <IdCard size={18} className="flex-shrink-0 text-secondary" />
                    <label className="text-sm font-medium text-text">Identity Document</label>
                  </div>
                  <div
                    className="grid grid-cols-2 gap-2 p-1 mb-3 border rounded-lg border-secondary/20 bg-secondary/5"
                    role="tablist"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={fuIdType === "aadhaar"}
                      onClick={() => {
                        setFuIdType("aadhaar");
                        setErrors((prev) => ({ ...prev, fuAadharNo: "", fuPassportNo: "" }));
                      }}
                      className={`py-2 text-sm font-semibold rounded-md transition-colors ${
                        fuIdType === "aadhaar"
                          ? "bg-white text-primary shadow-sm"
                          : "text-secondary"
                      }`}
                      data-testid={createTestId("forgot-username", "id-type-aadhaar")}
                    >
                      Aadhaar
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={fuIdType === "passport"}
                      onClick={() => {
                        setFuIdType("passport");
                        setErrors((prev) => ({ ...prev, fuAadharNo: "", fuPassportNo: "" }));
                      }}
                      className={`py-2 text-sm font-semibold rounded-md transition-colors ${
                        fuIdType === "passport"
                          ? "bg-white text-primary shadow-sm"
                          : "text-secondary"
                      }`}
                      data-testid={createTestId("forgot-username", "id-type-passport")}
                    >
                      Passport
                    </button>
                  </div>

                  {fuIdType === "aadhaar" ? (
                    <Input
                      placeholder="Enter your 12-digit Aadhaar number"
                      value={fuAadharNo}
                      onChange={(e) => {
                        setFuAadharNo(e.target.value.replace(/\D/g, ""));
                        setErrors((prev) => ({ ...prev, fuAadharNo: "" }));
                      }}
                      error={errors.fuAadharNo}
                      testId={createTestId("forgot-username", "aadhar-input")}
                    />
                  ) : (
                    <Input
                      placeholder="Enter your passport number"
                      value={fuPassportNo}
                      onChange={(e) => {
                        setFuPassportNo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                        setErrors((prev) => ({ ...prev, fuPassportNo: "" }));
                      }}
                      error={errors.fuPassportNo}
                      testId={createTestId("forgot-username", "passport-input")}
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone size={18} className="flex-shrink-0 text-secondary" />
                    <label className="text-sm font-medium text-text">Mobile Number</label>
                  </div>
                  <Input
                    placeholder="Enter your registered mobile number"
                    value={fuMobile}
                    onChange={(e) => {
                      setFuMobile(e.target.value.replace(/\D/g, ""));
                      setErrors((prev) => ({ ...prev, fuMobile: "" }));
                    }}
                    error={errors.fuMobile}
                    testId={createTestId("forgot-username", "mobile-input")}
                  />
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  className="block w-full mx-auto sm:w-64"
                  disabled={isLoading}
                  testId={createTestId("forgot-username", "send-otp-button")}
                >
                  {isLoading ? "Sending OTP..." : "Send OTP"}
                </Button>
              </form>
            )}

            {/* STEP 2 — Enter OTP */}
            {forgotUsernameStep === "otp" && (
              <form onSubmit={handleVerifyUsernameOtp} className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={18} className="flex-shrink-0 text-secondary" />
                    <label className="text-sm font-medium text-text">OTP</label>
                  </div>
                  <Input
                    placeholder="Enter 6-digit OTP"
                    value={fuOtp}
                    onChange={(e) => {
                      setFuOtp(e.target.value.replace(/\D/g, ""));
                      setErrors((prev) => ({ ...prev, fuOtp: "" }));
                    }}
                    error={errors.fuOtp}
                    testId={createTestId("forgot-username", "otp-input")}
                  />
                </div>

                <div className="text-sm text-center text-secondary">
                  Didn't receive the OTP?{" "}
                  <button
                    type="button"
                    onClick={handleResendUsernameOtp}
                    disabled={fuResendCooldown > 0 || isLoading}
                    className="font-bold text-primary hover:underline disabled:text-secondary/50 disabled:no-underline disabled:cursor-not-allowed"
                    data-testid={createTestId("forgot-username", "resend-otp-button")}
                  >
                    {fuResendCooldown > 0 ? `Resend in ${fuResendCooldown}s` : "Resend OTP"}
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  className="block w-full mx-auto sm:w-64"
                  disabled={isLoading}
                  testId={createTestId("forgot-username", "verify-otp-button")}
                >
                  {isLoading ? "Verifying..." : "Verify & Get Username"}
                </Button>
              </form>
            )}

            {/* STEP 3 — Success */}
            {forgotUsernameStep === "success" && (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="flex items-center justify-center w-16 h-16 mb-4 border-2 rounded-full border-secondary/20 bg-secondary/5">
                  <CheckCircle size={32} className="text-secondary" />
                </div>
                <h2 className="text-2xl font-bold sm:text-3xl text-text">
                  Username Found
                </h2>
                <p className="mt-2 text-sm text-secondary sm:text-base">
                  Here is the username associated with your account.
                </p>

                <div
                  className="px-6 py-3 mt-5 text-xl font-bold tracking-wide border-2 rounded-xl border-secondary/30 bg-secondary/5 text-primary"
                  data-testid={createTestId("forgot-username", "recovered-username")}
                >
                  {fuUsername}
                </div>

                <p className="mt-4 text-xs text-secondary sm:text-sm">
                  Forgot your password too? Use{" "}
                  <button
                    type="button"
                    onClick={handleResetPasswordFromUsername}
                    className="font-bold text-primary hover:underline"
                    data-testid={createTestId("forgot-username", "reset-password-link")}
                  >
                    Forgot Password
                  </button>{" "}
                  on the login page to reset it.
                </p>

                <Button
                  type="button"
                  variant="secondary"
                  className="block w-full mx-auto mt-6 sm:w-64"
                  onClick={handleBackFromForgotUsername}
                  testId={createTestId("forgot-username", "back-to-login-button")}
                >
                  Back to Login
                </Button>
              </div>
            )}
          </div>
        )}

        <p className="mt-6 text-xs text-center text-secondary sm:mt-8">
          © {new Date().getFullYear()} MGRDPR University
        </p>
      </div>
    </div>
  );
}