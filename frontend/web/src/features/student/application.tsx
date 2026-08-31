/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Lock } from "lucide-react";
import AppLayout from "../../components/layouts/AppLayout";
import Toast from "../../components/ui/Toast";

import PersonalDetailsSection from "../application/personal_details";
import type { PersonalDetailsData } from "../application/personal_details";
import DegreeCourseSection from "../application/degree_course";
import EducationSection from "../application/education";
import SeatDegreeSection from "../application/seat_degree";

import { getMyFullApplication } from "../../services/applicationQueryService";
import { getApplications } from "../../services/applicationService";
import { getAcademicDates } from "../../services/academicDateService";
import { useAdmissionLock } from "../../hooks/useAdmissionLock";

const isWindowActive = (start?: string, end?: string) => {
  if (!start || !end) return false;
  const now = new Date();
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);
  return now >= new Date(start) && now <= endDate;
};

/* ─── Steps ───────────────────────────────────────────────────────────────── */

const STEPS = [
  { id: 0, label: "Personal Details" },
  { id: 1, label: "Education" },
  { id: 2, label: "Degree & Course" },
  { id: 3, label: "Seat & Degree" },
];

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function ApplicationPage() {
  const { locked, checking: lockChecking } = useAdmissionLock();
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Centralised application state
  const [applicationId, setApplicationId] = useState<string | undefined>();
  const [applicationAppNo, setApplicationAppNo] = useState<string | undefined>();
  const [personalInitialData, setPersonalInitialData] = useState<Partial<PersonalDetailsData>>({});

  const [toast, ] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [appLoaded, setAppLoaded] = useState(false);

  const loadApplication = useCallback(async () => {
    try {
      const apps = await getApplications();
      if (!apps.length) return;
      const { appNo } = apps[0];
      const result = await getMyFullApplication();
      const app = result.application;

      const splitAddr = (addr?: string) => {
        const parts = (addr ?? "").split(", ").map((p) => p.trim());
        return {
          line1: parts[0] ?? "",
          line2: parts[1] ?? "",
          city: parts[2] ?? "",
          state: parts[3] ?? "",
          country: parts[4] ?? "",
          postalCode: parts[5] ?? "",
        };
      };
      const perm = splitAddr(app.permanentAddress);
      const comm = splitAddr(app.communicationAddress);
      const sameAddress = app.permanentAddress === app.communicationAddress;

      setApplicationId(app.id);
      setApplicationAppNo(app.appNo);
      setPersonalInitialData({
        academicYearId: app.academicYearId ?? "",
        fullName: app.name ?? "",
        dob: app.dob ? app.dob.split("T")[0] : "",
        gender: app.gender ?? "",
        phone: app.phone ?? "",
        email: app.email ?? "",
        nationality: app.nationalityId ?? "",
        aadharNumber: app.aadharNo ?? "",
        karnatakaYn: app.karnatakaYn === true ? "true" : app.karnatakaYn === false ? "false" : "",
        homeState: app.placeOfBirth ?? "",
        religion: app.religion ?? "",
        category: app.categoryId ?? "",
        caste: app.caste ?? "",
        annualIncome: app.annualIncome != null ? String(app.annualIncome) : "",
        rdNumber: app.rdNumber ?? "",
        casteRdNumber: app.casteRdNumber ?? "",
        passportNumber: app.passportNo ?? "",
        visaNumber: app.visaNo ?? "",
        passportExpiry: app.passportExpiryDate ?? "",
        visaExpiry: app.visaExpiryDate ?? "",
        fatherName: app.fatherName ?? "",
        fatherOccupation: app.fatherOccupation ?? "",
        fatherMobile: app.fatherNo ?? "",
        motherName: app.motherName ?? "",
        motherOccupation: app.motherOccupation ?? "",
        motherMobile: app.motherNo ?? "",
        guardianName: app.guardianName ?? "",
        guardianMobile: app.guardianNo ?? "",
        satsId: app.statsId ?? "",
        apaarId: app.apaarId ?? "",
        permanentAddressLine1: perm.line1,
        permanentAddressLine2: perm.line2,
        permanentCity: perm.city,
        permanentState: perm.state,
        permanentCountry: perm.country,
        permanentPostalCode: perm.postalCode,
        sameAsPermanent: sameAddress,
        presentAddressLine1: sameAddress ? "" : comm.line1,
        presentAddressLine2: sameAddress ? "" : comm.line2,
        presentCity: sameAddress ? "" : comm.city,
        presentState: sameAddress ? "" : comm.state,
        presentCountry: sameAddress ? "" : comm.country,
        presentPostalCode: sameAddress ? "" : comm.postalCode,
      });
      setCompletedSteps(new Set([0]));
    } catch {
      // No existing application — start fresh
    } finally {
      setAppLoaded(true);  // ← always fires
    }
  }, []);

  useEffect(() => {
    loadApplication();
    const checkWindow = async () => {
      try {
        const dates = await getAcademicDates();
        const win = dates.find((d) => d.name === "ADMISSION_WINDOW");
        setReadOnly(!isWindowActive(win?.startDate, win?.endDate));
      } catch {
        setReadOnly(false);
      }
    };
    checkWindow();
  }, [loadApplication]);

  /* ── Step helpers ─────────────────────────────────────────────────────────── */

  const completeStep = (step: number) =>
    setCompletedSteps((prev) => new Set([...prev, step]));

  // Single source of truth for "can the user click this step" — a step is
  // reachable if it's the first step, or the immediately preceding step has
  // been completed. (Previously the last step was always clickable, which let
  // users skip straight to Seat & Degree without finishing earlier steps.)
  const isStepClickable = (step: number) => step === 0 || completedSteps.has(step - 1);

  const goTo = async (step: number) => {
  if (isStepClickable(step)) {
    if (step === 0 && activeStep !== 0) {
      // Re-fetch fresh data when navigating back to Personal Details
      setAppLoaded(false);
      await loadApplication();
    }
    setActiveStep(step);
  }
};

  /* ── Section callbacks ────────────────────────────────────────────────────── */
  const handlePersonalNext = (appId: string) => {
    setApplicationId(appId);
    completeStep(0);
    setActiveStep(1);
  };

  const handleEducationNext = () => {
    completeStep(1);
    setActiveStep(2);
  };

  const handleDegreeCourseNext = () => {
    completeStep(2);
    setActiveStep(3);
  };

  const handleSeatNext = () => {
    completeStep(3);
    setActiveStep(4);
  };


  /* ── UI ───────────────────────────────────────────────────────────────────── */
  if (lockChecking) {
    return (
      <AppLayout pageTitle="Application">
        <div className="flex items-center justify-center h-[calc(100vh-56px)] text-sm text-gray-400">
          Loading...
        </div>
      </AppLayout>
    );
  }

  const effectiveReadOnly = readOnly || locked;

  return (
    <AppLayout pageTitle="Application">
      <div data-testid="application-page" className="flex flex-col h-[calc(100vh-56px)] p-4 gap-3">

        {toast && (
          <div className="fixed z-50 top-5 right-5">
            <Toast message={toast.message} type={toast.type} />
          </div>
        )}

        {/* ── View-only banner — admission window closed, or admission fee already paid ── */}
        {effectiveReadOnly && (
          <div className="flex items-center gap-3 px-4 py-3 border rounded-lg bg-amber-50 border-amber-200 text-amber-700 shrink-0">
            <Lock size={15} className="shrink-0" />
            <p className="text-sm font-medium">
              {locked
                ? "Your admission fee has been paid. Your form is view-only."
                : "The application window is closed. Your form is view-only."}
            </p>
          </div>
        )}

        {/* ── Stepper — always visible ──────────────────────────────────────── */}
        <div data-testid="stepper" className="flex items-center overflow-hidden bg-white border rounded-lg shrink-0">
          {STEPS.map((step, idx) => {
            const isActive = activeStep === step.id;
            const isDone = completedSteps.has(step.id);
            const isClickable = isStepClickable(step.id);

            return (
              <button
                key={step.id}
                data-testid={`step-btn-${step.id}`}
                onClick={() => goTo(step.id)}
                disabled={!isClickable}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-semibold
                  border-r last:border-r-0 border-gray-100 transition-colors
                  ${isActive ? "bg-primary text-white" : ""}
                  ${isDone && !isActive ? "bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer" : ""}
                  ${!isDone && !isActive ? "text-gray-400" : ""}
                  ${!isClickable ? "cursor-not-allowed opacity-40" : ""}
                `}
              >
                {isDone && !isActive && <CheckCircle size={13} className="text-green-600 shrink-0" />}
                {idx + 1}. {step.label}
              </button>
            );
          })}
        </div>

        {/* ── Scrollable section content ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-white border rounded-lg">
          <div className="p-5">
            {activeStep === 0 && appLoaded && (
              <PersonalDetailsSection
                applicationId={applicationId}
                appNo={applicationAppNo}
                initialData={personalInitialData}
                onNext={handlePersonalNext}
                readOnly={effectiveReadOnly}
              />
            )}


            {activeStep === 1 && applicationId && (
              <EducationSection
                applicationId={applicationId}
                appNo={applicationAppNo}
                onNext={handleEducationNext}
                onBack={async () => { setAppLoaded(false); await loadApplication(); setActiveStep(0); }}
                readOnly={effectiveReadOnly}
              />
            )}

            {activeStep === 2 && applicationId && (
              <DegreeCourseSection
                applicationId={applicationId}
                appNo={applicationAppNo}
                onNext={handleDegreeCourseNext}
                onBack={() => setActiveStep(1)}
                readOnly={effectiveReadOnly}
              />
            )}

            {activeStep === 3 && applicationId && (
              <SeatDegreeSection
                applicationId={applicationId}
                appNo={applicationAppNo}
                onNext={handleSeatNext}
                onBack={() => setActiveStep(2)}
                readOnly={effectiveReadOnly}
              />
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}