import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FileText, Download, RefreshCw, Eye } from "lucide-react";

import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import AppLayout from "../../components/layouts/AppLayout";
import FilterPanel from "../../components/ui/FilterPanel";
import Toast from "../../components/ui/Toast";

import { getDegrees } from "../../services/degreeService";
import type { Degree } from "../../services/degreeService";
import { getCoursesByDegree } from "../../services/courseService";
import type { Course } from "../../services/courseService";
import { getAcademicYears } from "../../services/academicYearService";
import type { AcademicYear } from "../../services/academicYearService";
import { getLookupsByType } from "../../services/lookupService";
import type { LookupResponse } from "../../services/lookupService";

import {
  getAdmittedStudentsList,
  downloadAdmittedStudentsPdf,
  getDocumentVerificationList,
  downloadDocumentVerificationPdf,
  getMeritList,
  downloadMeritListPdf,
  downloadSelectedListPdf,
  getSelectedList,
  getPgInServiceList, 
  downloadPgInServicePdf, 
  getFeePaymentList,
  downloadFeePaymentPdf,
  getFacilityReportList,
  downloadFacilityReportPdf,
  getManualFeeList,
  downloadManualFeePdf,
} from "../../services/reportService";
import type {
  AdmittedStudentRow,
  AdmittedStudentsResult,
  AdmittedStudentsParams,
  DocumentVerificationRow,
  MeritListRow,
  MeritListResult,
  SelectedListRow,
  SelectedListResult,
  PgInServiceResult,
  PgInServiceApplicantRow,
  FeeCollectionRow,
  FeePaymentResult,
  FacilityReportRow,
  FacilityReportResult,
  FacilityReportParams,
  ManualFeeCollectionRow,
  ManualFeeResult,
  ManualFeeParams,
} from "../../services/reportService";

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                           */
/* ------------------------------------------------------------------ */

type ReportType =
  | "merit-list"
  | "selected-list" 
  | "pg-inservice"
  | "document-verification"
  | "fee-payment"
  | "manual-fee"
  | "admitted-students"
  | "OptedTransport"
  | "OPtedHostel";

const REPORT_LABELS: Record<ReportType, string> = {
  "merit-list": "Merit List",
  "selected-list": "Provisional Select List",
  "pg-inservice": "PG In-Service (Course-wise)",
  "document-verification": "Document Verification",
  "fee-payment": "Fee Payment",
  "manual-fee": "Manual Fee Collection",
  "admitted-students": "Admitted Students List",
  OptedTransport: "Opted Transport",
  OPtedHostel: "Opted Hostel",
};

/* Fee type options per report type */
const FEE_TYPE_OPTIONS: Record<string, { label: string; value: string }[]> = {
  "fee-payment": [
    { label: "Application Fee", value: "Application Fee" },
    { label: "Admission Fee", value: "Admission Fee" },
  ],
  "manual-fee": [
    { label: "Application Fee – Manual", value: "Application Fee - Manual" },
    { label: "Admission Fee – Manual", value: "Admission Fee - Manual" },
  ],
};

const STATUS_COLOR_PALETTE = [
  "bg-green-100 text-green-800",
  "bg-yellow-100 text-yellow-800",
  "bg-red-100 text-red-800",
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
  "bg-indigo-100 text-indigo-800",
];

const STATIC_STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  partial: "bg-orange-100 text-orange-800",
  refunded: "bg-purple-100 text-purple-800",
  male: "bg-blue-100 text-blue-800",
  female: "bg-purple-100 text-purple-800",
  other: "bg-amber-100 text-amber-800",
};

/* ------------------------------------------------------------------ */
/*  SUB-COMPONENTS                                                      */
/* ------------------------------------------------------------------ */

const StudentTypeBadge = ({ type }: { type: string }) => {
  const palette: Record<string, string> = {
    Karnataka: "bg-indigo-100 text-indigo-800",
    HyderabadKarnataka: "bg-purple-100 text-purple-800",
    NonKarnataka: "bg-orange-100 text-orange-800",
    KA: "bg-indigo-100 text-indigo-800",
    HK: "bg-purple-100 text-purple-800",
    NK: "bg-orange-100 text-orange-800",
  };
  const labels: Record<string, string> = {
    Karnataka: "Karnataka",
    HyderabadKarnataka: "HK",
    NonKarnataka: "Non-KA",
    KA: "Karnataka",
    HK: "HK",
    NK: "Non-KA",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${palette[type] ?? "bg-gray-100 text-gray-700"
        }`}
    >
      {labels[type] ?? type}
    </span>
  );
};

/* ================================================================== */
/*  COMPONENT                                                           */
/* ================================================================== */

export default function ReportsPage() {

  /* ── Report type ── */
  const [selectedReportType, setSelectedReportType] =
    useState<ReportType>("merit-list");

  /* ── Selectors ── */
  const [selectedDegreeTypeId, setSelectedDegreeTypeId] = useState("");
  const [selectedDegreeId, setSelectedDegreeId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [selectedFeeType, setSelectedFeeType] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  /* ── Report data ── */
  const [meritResult, setMeritResult] = useState<MeritListResult | null>(null);
  const [docRows, setDocRows] = useState<DocumentVerificationRow[]>([]);
  const [feeResult, setFeeResult] = useState<FeePaymentResult | null>(null);
  const [facilityResult, setFacilityResult] = useState<FacilityReportResult | null>(null);
  const [admittedResult, setAdmittedResult] = useState<AdmittedStudentsResult | null>(null);
  const [manualFeeResult, setManualFeeResult] = useState<ManualFeeResult | null>(null);
  const [selectedListResult, setSelectedListResult] = useState<SelectedListResult | null>(null);
  const [pgInServiceResult, setPgInServiceResult] = useState<PgInServiceResult | null>(null);

  /* ── UI state ── */
  const [reportGenerated, setReportGenerated] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error" | "info";
  } | null>(null);

  /* ── Concurrency guards ── */
  const isGeneratingRef = useRef(false);
  const isDownloadingRef = useRef(false);

  /* ── Lookup data ── */
  const [degrees, setDegrees] = useState<Degree[]>([]);

  const [degreeTypes, setDegreeTypes] = useState<LookupResponse[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [categories, setCategories] = useState<LookupResponse[]>([]);
  const [seatTypes, setSeatTypes] = useState<LookupResponse[]>([]);
  const [genders, setGenders] = useState<LookupResponse[]>([]);
  const [verificationStatuses, setVerificationStatuses] = useState<LookupResponse[]>([]);

  const [loadingDegrees, setLoadingDegrees] = useState(false);
  const [loadingDegreeTypes, setLoadingDegreeTypes] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingAcademicYears, setLoadingAcademicYears] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);


  /* ── Toast auto-dismiss ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);


  useEffect(() => {
    (async () => {
      setLoadingDegrees(true);
      try { setDegrees(await getDegrees()); }
      catch (e) { console.error(e); }
      finally { setLoadingDegrees(false); }
    })();
  }, []);



  useEffect(() => {
    (async () => {
      setLoadingDegreeTypes(true);
      try { setDegreeTypes(await getLookupsByType("DegreeType")); }
      catch (e) { console.error(e); }
      finally { setLoadingDegreeTypes(false); }
    })();
  }, []);


  useEffect(() => {
    (async () => {
      setLoadingAcademicYears(true);
      try { setAcademicYears(await getAcademicYears()); }
      catch (e) { console.error(e); }
      finally { setLoadingAcademicYears(false); }
    })();
  }, []);


  useEffect(() => {
    (async () => {
      setLoadingLookups(true);
      try {
        const [catData, stData, genderData, vsData] = await Promise.all([
          getLookupsByType("Category"),
          getLookupsByType("SeatType", ""),
          getLookupsByType("Gender"),
          getLookupsByType("Verification"),
        ]);
        setCategories(catData);
        setSeatTypes(stData);
        setGenders(genderData);
        setVerificationStatuses(vsData);
      } catch (e) { console.error(e); }
      finally { setLoadingLookups(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedDegreeId) { setCourses([]); setSelectedCourseId(""); return; }
    (async () => {
      setLoadingCourses(true);
      try { setCourses(await getCoursesByDegree(selectedDegreeId)); }
      catch (e) { console.error(e); }
      finally { setLoadingCourses(false); }
    })();
  }, [selectedDegreeId]);

  /* ------------------------------------------------------------------ */
  /*  CHANGE 1: Derive `isPG` from the selected Degree Type.               */
  /*  We look up the selected degree type's name/code in the `degreeTypes` */
  /*  lookup list and treat it as Postgraduate if it matches "PG" or       */
  /*  contains "POST" (case-insensitive). Adjust the matching logic below  */
  /*  if your backend uses a different code/name convention for PG.        */
  /* ------------------------------------------------------------------ */
  const isPG = useMemo(() => {
    const degreeType = degreeTypes.find(
      (d) => d.id === selectedDegreeTypeId
    );

    return degreeType?.name === "Postgraduate (PG)";
  }, [degreeTypes, selectedDegreeTypeId]);
  
  /* ------------------------------------------------------------------ */
  /*  DYNAMIC STATUS COLOR MAP                                           */
  /* ------------------------------------------------------------------ */

  const statusColorMap = useMemo(() => {
    const map: Record<string, string> = { ...STATIC_STATUS_COLORS };
    verificationStatuses.forEach((vs, idx) => {
      const key = (vs.name ?? vs.code ?? vs.id).toLowerCase();
      map[key] = STATUS_COLOR_PALETTE[idx % STATUS_COLOR_PALETTE.length];
    });
    return map;
  }, [verificationStatuses]);

  const StatusBadge = useCallback(
    ({ status }: { status: string }) => (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColorMap[status?.toLowerCase()] ?? "bg-gray-100 text-gray-700"
          }`}
      >
        {status}
      </span>
    ),
    [statusColorMap]
  );

  /* ------------------------------------------------------------------ */
  /*  LOOKUP HELPERS                                                      */
  /* ------------------------------------------------------------------ */
  const resolveCategoryNames = useCallback(
    (ids: string[]): string[] =>
      ids.map((id) => categories.find((c) => c.id === id)?.name ?? id),
    [categories]
  );

  const resolveSeatTypeNames = useCallback(
    (ids: string[]): string[] =>
      ids.map((id) => seatTypes.find((s) => s.id === id)?.name ?? id),
    [seatTypes]
  );

  const resolveGenderNames = useCallback(
    (ids: string[]): string[] =>
      ids.map((id) => genders.find((g) => g.id === id)?.name ?? id),
    [genders]
  );

  const needsFeeType = (type: ReportType) =>
    type === "fee-payment" || type === "manual-fee";

  const needsDegreeType = (type: ReportType) => type === "merit-list" || type === "selected-list" || type === "pg-inservice";

  const showFilterPanel = (type: ReportType) =>
    !needsFeeType(type);


  const filteredDegrees = useMemo(() => {
    console.log("Selected Degree Type:", selectedDegreeTypeId);
    console.log("All Degrees:", degrees);

    const filtered = !needsDegreeType(selectedReportType) || !selectedDegreeTypeId
      ? degrees
      : degrees.filter((d) => d.degreeTypeId === selectedDegreeTypeId);

    console.log("Filtered Degrees:", filtered);

    return filtered;
  }, [degrees, selectedDegreeTypeId, selectedReportType]);

  const buildAdmittedParams = useCallback((): AdmittedStudentsParams => ({
    degreeId: isPG ? undefined : (selectedDegreeId || undefined),
    courseId: isPG ? undefined : (selectedCourseId || undefined),
    academicYearId: selectedAcademicYearId || undefined,
    category: filters.category?.length
      ? resolveCategoryNames(filters.category).join(",")
      : undefined,
    admitYn: filters.admitStatus?.length === 1
      ? filters.admitStatus[0] === "admitted"
      : undefined,
  }), [isPG, selectedDegreeId, selectedCourseId, selectedAcademicYearId, filters, resolveCategoryNames]);

  const buildBaseParams = useCallback(() => {
    const categoryNames = filters.category?.length
      ? resolveCategoryNames(filters.category)
      : [];
    const seatTypeNames = filters.seatType?.length
      ? resolveSeatTypeNames(filters.seatType)
      : [];
    const requiresDegreeCourse =
      selectedReportType !== "pg-inservice" &&
      (!isPG || selectedReportType === "merit-list" || selectedReportType === "selected-list");
    return {
      degreeTypeId: selectedDegreeTypeId || undefined,
      degreeId: requiresDegreeCourse ? (selectedDegreeId || undefined) : undefined,
      courseId: requiresDegreeCourse ? (selectedCourseId || undefined) : undefined,
      academicYearId: selectedAcademicYearId || undefined,
      category: categoryNames.length ? categoryNames.join(",") : undefined,
      seatType: seatTypeNames.length ? seatTypeNames.join(",") : undefined,
    };
  }, [
    selectedDegreeTypeId,
    isPG,
    selectedReportType,
    selectedDegreeId,
    selectedCourseId,
    selectedAcademicYearId,
    filters,
    resolveCategoryNames,
    resolveSeatTypeNames,
  ]);

  const buildDocParams = useCallback(() => ({
    ...buildBaseParams(),
    karnataka: filters.type?.length ? filters.type.join(",") : undefined,
    status: filters.status?.length ? filters.status.join(",") : undefined,
  }), [buildBaseParams, filters]);

  const buildMeritParams = useCallback(() => ({
    ...buildBaseParams(),
    karnataka: filters.type?.length ? filters.type.join(",") : undefined,
    listType: "omnibus",
  }), [buildBaseParams, filters]);
  const buildSelectedListParams = useCallback(() => ({
    degreeTypeId: selectedDegreeTypeId || undefined,
    degreeId: selectedDegreeId || undefined,
    courseId: selectedCourseId || undefined,
    academicYearId: selectedAcademicYearId || undefined,
    category: filters.category?.length
      ? resolveCategoryNames(filters.category).join(",")
      : undefined,
  }), [selectedDegreeTypeId, selectedDegreeId, selectedCourseId, selectedAcademicYearId, filters, resolveCategoryNames]);
  const buildFeeParams = useCallback(() => ({
    degreeId: isPG ? undefined : (selectedDegreeId || undefined),
    courseId: isPG ? undefined : (selectedCourseId || undefined),
    academicYearId: selectedAcademicYearId || undefined,
    feeType: selectedFeeType || undefined,
  }), [isPG, selectedDegreeId, selectedCourseId, selectedAcademicYearId, selectedFeeType]);
  const buildPgInServiceParams = useCallback(() => ({
    degreeTypeId: selectedDegreeTypeId || undefined,
    category: filters.category?.length
      ? resolveCategoryNames(filters.category).join(",")
      : undefined,
  }), [selectedDegreeTypeId, filters, resolveCategoryNames]);
  const buildManualFeeParams = useCallback((): ManualFeeParams => ({
    degreeId: isPG ? undefined : (selectedDegreeId || undefined),
    courseId: isPG ? undefined : (selectedCourseId || undefined),
    academicYearId: selectedAcademicYearId || undefined,
    feeType: selectedFeeType || undefined,
  }), [isPG, selectedDegreeId, selectedCourseId, selectedAcademicYearId, selectedFeeType]);

  const buildFacilityParams = useCallback((): FacilityReportParams => ({
    degreeId: isPG ? undefined : (selectedDegreeId || undefined),
    courseId: isPG ? undefined : (selectedCourseId || undefined),
    academicYearId: selectedAcademicYearId || undefined,
    facilityType: selectedReportType === "OPtedHostel" ? "Hostel" : "Transport",
    gender: filters.gender?.length
      ? resolveGenderNames(filters.gender).join(",")
      : undefined,
    status: filters.status?.length ? filters.status.join(",") : undefined,
  }), [
    isPG,
    selectedDegreeId,
    selectedCourseId,
    selectedAcademicYearId,
    filters,
    resolveGenderNames,
    selectedReportType,
  ]);


  const validateSelection = () => {
    const requiresDegreeCourse =
      selectedReportType !== "pg-inservice" &&
      (!isPG || selectedReportType === "merit-list" || selectedReportType === "selected-list");
    if (
      (needsDegreeType(selectedReportType) && !selectedDegreeTypeId) ||
      (requiresDegreeCourse && !selectedDegreeId) ||
      (requiresDegreeCourse && !selectedCourseId) ||
      !selectedAcademicYearId
    ) {
      setToast({
        message: `Please select ${needsDegreeType(selectedReportType) ? "Degree Type, " : ""}${requiresDegreeCourse ? "Degree, Course and " : ""}Academic Year`,
        type: "error",
      });
      return false;
    }
    if (needsFeeType(selectedReportType) && !selectedFeeType) {
      setToast({ message: "Please select Fee Type", type: "error" });
      return false;
    }
    return true;
  };

  const handleGenerateReport = async () => {
    if (isGeneratingRef.current) return;
    if (!validateSelection()) return;
    isGeneratingRef.current = true;
    setReportError(null);
    setLoadingReport(true);
    setReportGenerated(false);
    try {
      if (selectedReportType === "document-verification") {
        setDocRows(await getDocumentVerificationList(buildDocParams()));
      } else if (selectedReportType === "merit-list") {
        setMeritResult(await getMeritList(buildMeritParams()));
      } else if (selectedReportType === "selected-list") {
        setSelectedListResult(await getSelectedList(buildSelectedListParams()));
      } else if (selectedReportType === "pg-inservice") {           // ← add
        setPgInServiceResult(await getPgInServiceList(buildPgInServiceParams()));
      }
      else if (selectedReportType === "fee-payment") {
        setFeeResult(await getFeePaymentList(buildFeeParams()));
      } else if (selectedReportType === "manual-fee") {
        setManualFeeResult(await getManualFeeList(buildManualFeeParams()));
      } else if (selectedReportType === "admitted-students") {
        setAdmittedResult(await getAdmittedStudentsList(buildAdmittedParams()));
      } else if (
        selectedReportType === "OptedTransport" ||
        selectedReportType === "OPtedHostel"
      ) {
        setFacilityResult(await getFacilityReportList(buildFacilityParams()));
      }
      setReportGenerated(true);
    } catch (err: unknown) {
      console.error(err);
      setReportError(err instanceof Error ? err.message : "Failed to generate report.");
    } finally {
      setLoadingReport(false);
      isGeneratingRef.current = false;
    }
  };

  const handleDownload = async () => {
    if (isDownloadingRef.current) return;
    if (!validateSelection()) return;
    isDownloadingRef.current = true;
    setDownloading(true);
    try {
      if (selectedReportType === "document-verification") {
        await downloadDocumentVerificationPdf(buildDocParams());
      } else if (selectedReportType === "merit-list") {
        await downloadMeritListPdf({ ...buildMeritParams(), listType: "omnibus" });

      } else if (selectedReportType === "selected-list") {
        await downloadSelectedListPdf(buildSelectedListParams());
      } else if (selectedReportType === "pg-inservice") {           // ← add
        await downloadPgInServicePdf(buildPgInServiceParams());
      }
      else if (selectedReportType === "fee-payment") {
        await downloadFeePaymentPdf(buildFeeParams());
      } else if (selectedReportType === "manual-fee") {
        await downloadManualFeePdf(buildManualFeeParams());
      } else if (selectedReportType === "admitted-students") {
        await downloadAdmittedStudentsPdf(buildAdmittedParams());
      } else if (
        selectedReportType === "OptedTransport" ||
        selectedReportType === "OPtedHostel"
      ) {
        await downloadFacilityReportPdf(buildFacilityParams());
      }
      setToast({ message: "PDF downloaded successfully", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to download PDF. Please try again.", type: "error" });
    } finally {
      setDownloading(false);
      isDownloadingRef.current = false;
    }
  };

  const handleDegreeTypeChange = (id: string) => {
    console.log("Selected Degree Type Id:", id);

    setSelectedDegreeTypeId(id);
    setSelectedDegreeId("");
    setSelectedCourseId("");
    setReportGenerated(false);
  };

  const handleReset = () => {
    setSelectedDegreeId("");
    setSelectedCourseId("");
    setSelectedAcademicYearId("");
    setSelectedFeeType("");
    setFilters({});
    setReportGenerated(false);
    setDocRows([]);
    setMeritResult(null);
    setFeeResult(null);
    setFacilityResult(null);
    setAdmittedResult(null);
    setManualFeeResult(null);
    setReportError(null);
    setSelectedListResult(null);
    setPgInServiceResult(null);
  };

  const switchReportType = (type: ReportType) => {
    setSelectedReportType(type);
    setSelectedFeeType("");
    setReportGenerated(false);
    setReportError(null);
    setDocRows([]);
    setMeritResult(null);
    setSelectedListResult(null);
    setPgInServiceResult(null);
    setFeeResult(null);
    setFacilityResult(null);
    setAdmittedResult(null);
    setManualFeeResult(null);
    setFilters({});
  };


  const verificationStatusOptions = useMemo(
    () =>
      verificationStatuses.map((vs) => ({
        label: vs.name ?? vs.code ?? vs.id,
        value: vs.name ?? vs.code ?? vs.id,
      })),
    [verificationStatuses]
  );

  const docVerificationFilterSections = useMemo(
    () => [
      {
        title: "Category",
        key: "category",
        options: categories.map((c) => ({ label: c.name ?? c.code ?? c.id, value: c.id })),
      },
      {
        title: "Seat Type",
        key: "seatType",
        options: seatTypes.map((s) => ({ label: s.name ?? s.code ?? s.id, value: s.id })),
      },
      {
        title: "Type",
        key: "type",
        options: [
          { label: "KA", value: "KA" },
          { label: "HK", value: "HK" },
          { label: "NK", value: "NK" },
        ],
      },
      {
        title: "Status",
        key: "status",
        options: verificationStatusOptions,
      },
    ],
    [categories, seatTypes, verificationStatusOptions]
  );

  const meritListFilterSections = useMemo(
    () => [
      {
        title: "Category",
        key: "category",
        options: categories.map((c) => ({ label: c.name ?? c.code ?? c.id, value: c.id })),
      },
      {
        title: "Seat Type",
        key: "seatType",
        options: seatTypes.map((s) => ({ label: s.name ?? s.code ?? s.id, value: s.id })),
      },
      {
        title: "Type",
        key: "type",
        options: [
          { label: "KA", value: "KA" },
          { label: "HK", value: "HK" },
          { label: "NK", value: "NK" },
        ],
      },
    ],
    [categories, seatTypes]
  );

  const facilityFilterSections = useMemo(
    () => [
      {
        title: "Gender",
        key: "gender",
        options: genders.map((g) => ({ label: g.name ?? g.code ?? g.id, value: g.id })),
      },
      {
        title: "Status",
        key: "status",
        options: verificationStatusOptions,
      },
    ],
    [genders, verificationStatusOptions]
  );

  const admittedStudentsFilterSections = useMemo(
    () => [
      {
        title: "Category",
        key: "category",
        options: categories.map((c) => ({ label: c.name ?? c.code ?? c.id, value: c.id })),
      },

    ],
    [categories]
  );
  const pgInServiceFilterSections = useMemo(
    () => [
      {
        title: "Category",
        key: "category",
        options: categories.map((c) => ({ label: c.name ?? c.code ?? c.id, value: c.id })),
      },
    ],
    [categories]
  );
  const activeFilterSections = useMemo(() => {
    if (selectedReportType === "merit-list" || selectedReportType === "selected-list")
      return meritListFilterSections;
    if (selectedReportType === "pg-inservice") return pgInServiceFilterSections;
    if (selectedReportType === "admitted-students") return admittedStudentsFilterSections;
    if (
      selectedReportType === "OptedTransport" ||
      selectedReportType === "OPtedHostel"
    ) return facilityFilterSections;
    return docVerificationFilterSections;
  }, [
    selectedReportType,
    meritListFilterSections,
    pgInServiceFilterSections,
    admittedStudentsFilterSections,
    facilityFilterSections,
    docVerificationFilterSections,
  ]);
  

  /* ── Derived display labels ── */
  const selectedDegreeName = degrees.find((d) => d.id === selectedDegreeId)?.degreeName ?? "";
  const selectedCourseName = courses.find((c) => c.id === selectedCourseId)?.name ?? "";
  const selectedAcademicYearName = academicYears.find((a) => a.id === selectedAcademicYearId)?.description ?? "";
  const isCertificateCourse = useMemo(() => {
    return selectedDegreeName?.toLowerCase().includes("certificate") ?? false;
  }, [selectedDegreeName]);
  const recordCount = () => {
    if (selectedReportType === "document-verification") return docRows.length;
    if (selectedReportType === "merit-list" && meritResult)
      return meritResult.omnibus?.length ?? 0;
    if (selectedReportType === "selected-list" && selectedListResult)
      return selectedListResult.length;
    if (selectedReportType === "pg-inservice" && pgInServiceResult)   
      return pgInServiceResult.reduce((sum, g) => sum + g.applicants.length, 0);
    if (selectedReportType === "fee-payment" && feeResult)
      return feeResult.summary.totalApplications;
    if (selectedReportType === "manual-fee" && manualFeeResult)
      return manualFeeResult.summary.totalRecords;
    if (selectedReportType === "admitted-students" && admittedResult)
      return admittedResult.length;
    if (
      (selectedReportType === "OptedTransport" || selectedReportType === "OPtedHostel") &&
      facilityResult
    )
      return facilityResult.rows.length;
    return 0;
  };

  const showDownload =
    selectedReportType === "document-verification" ||
    selectedReportType === "merit-list" ||
    selectedReportType === "selected-list" || 
    selectedReportType === "pg-inservice" ||
    selectedReportType === "fee-payment" ||
    selectedReportType === "manual-fee" ||
    selectedReportType === "admitted-students" ||
    selectedReportType === "OptedTransport" ||
    selectedReportType === "OPtedHostel";



  const renderDocumentVerification = () => {
    if (docRows.length === 0)
      return (
        <div className="py-12 text-center text-gray-500">
          No records found for the selected filters.
        </div>
      );
    return (
      <Table
        columns={[
          { header: "Sl", accessor: "sl" as const },
          { header: "App No.", accessor: "appNo" as const },
          { header: "Name", accessor: "name" as const },
          { header: "Category", accessor: "category" as const },
          {
            header: "Seat Type",
            accessor: "seatType" as const,
            render: (row: DocumentVerificationRow) =>
              Array.isArray(row.seatType)
                ? row.seatType.join(", ") || "—"
                : row.seatType || "—",
          },
          { header: "Type", accessor: "karnataka" as const },
          {
            header: "Status",
            accessor: "status" as const,
            render: (row: DocumentVerificationRow) => (
              <StatusBadge status={row.status} />
            ),
          },
        ]}
        data={docRows}
      />
    );
  };

  const renderAdmittedStudents = () => {
    if (!admittedResult || admittedResult.length === 0)
      return (
        <div className="py-12 text-center text-gray-500">
          No records found for the selected filters.
        </div>
      );

    const totalAdmitted = admittedResult.filter((r) => r.admitYn).length;
    const totalNotAdmitted = admittedResult.filter((r) => !r.admitYn).length;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 mb-2 md:grid-cols-3">
          {[
            { label: "Total", value: admittedResult.length, color: "text-gray-800" },
            { label: "Admitted", value: totalAdmitted, color: "text-green-700" },
            { label: "Not Admitted", value: totalNotAdmitted, color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="p-4 text-center border border-gray-200 rounded-lg bg-gray-50">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
        <Table
          columns={[
            { header: "Sl", accessor: "sl" as const },
            { header: "App No.", accessor: "applicationNo" as const },
            { header: "Name", accessor: "name" as const },
            { header: "Category", accessor: "category" as const },
            { header: "Degree", accessor: "degreeName" as const },
            { header: "Course", accessor: "courseName" as const },
            {
              header: "Status",
              accessor: "admitYn" as const,
              render: (row: AdmittedStudentRow) => (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${row.admitYn
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-700"
                    }`}
                >
                  {row.admitYn ? "Admitted" : "Not Admitted"}
                </span>
              ),
            },
          ]}
          data={admittedResult}
        />
      </div>
    );
  };

  const renderMeritTable = (rows: MeritListRow[]) => {
    if (!rows || rows.length === 0)
      return (
        <div className="py-12 text-center text-gray-500">
          No records found for the selected filters.
        </div>
      );
    return (
      <Table
        columns={[
          { header: "#", accessor: "rank" as const },
          { header: "App No.", accessor: "appNo" as const },
          { header: "Name", accessor: "name" as const },
          { header: "Father", accessor: "fatherName" as const },
          { header: "Category", accessor: "category" as const },
          {
            header: "Seat Type",
            accessor: "seatTypes" as const,
            render: (row: MeritListRow) =>
              Array.isArray(row.seatTypes)
                ? row.seatTypes.join(", ") || "—"
                : "—",
          },
          {
            header: "Type",
            accessor: "studentType" as const,
            render: (row: MeritListRow) => (
              <StudentTypeBadge type={row.studentType} />
            ),
          },
          {
            header: "Score",
            accessor: "meritScore" as const,
            render: (row: MeritListRow) => (
              <span className="font-semibold text-primary">
                {row.meritScore.toFixed(2)}
              </span>
            ),
          },
          {
            header: "Pct%",
            accessor: "percentage" as const,
            render: (row: MeritListRow) => row.percentage.toFixed(2),
          },
          {
            header: "Status",
            accessor: "status" as const,
            render: (row: MeritListRow) => <StatusBadge status={row.status} />,
          },
        ]}
        data={rows}
      />
    );
  };
  const renderSelectedList = () => {
    if (!selectedListResult || selectedListResult.length === 0)
      return (
        <div className="py-12 text-center text-gray-500">
          No records found for the selected filters.
        </div>
      );
    return (
      <Table
        columns={[
          { header: "Sl", accessor: "sl" as const },
          { header: "App No.", accessor: "appNo" as const },
          { header: "Name", accessor: "name" as const },
          { header: "Category", accessor: "category" as const },
          {
            header: "Qualification",
            accessor: "qualification" as const,
            render: (row: SelectedListRow) => row.qualification || "—",
          },
          {
            header: "Merit Score/%",
            accessor: "meritScore" as const,
            render: (row: SelectedListRow) => (
              <span className="font-semibold text-primary">
                {row.meritScore.toFixed(2)}%
              </span>
            ),
          },
        ]}
        data={selectedListResult}
      />
    );
  };
  const renderMeritList = () => {
    if (!meritResult) return null;
    return renderMeritTable(meritResult.omnibus ?? []);
  };
  const renderPgInServiceList = () => {
    if (!pgInServiceResult || pgInServiceResult.length === 0)
      return (
        <div className="py-12 text-center text-gray-500">
          No records found for the selected filters.
        </div>
      );

    return (
      <div className="space-y-8 p-4">
        {pgInServiceResult.map((group) => (
          <div key={`${group.degreeName}-${group.courseName}`}>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-semibold text-text">
                {group.degreeName} — {group.courseName}
              </h3>
              <span className="text-xs text-gray-500">
                {group.applicants.length} applicants
              </span>
            </div>
            <Table
              columns={[
                { header: "Rank", accessor: "rank" as const },
                { header: "App No.", accessor: "appNo" as const },
                { header: "Name", accessor: "name" as const },
                { header: "Category", accessor: "category" as const },
                { header: "Pref.", accessor: "preference" as const },
                {
                  header: "Merit %",
                  accessor: "meritScore" as const,
                  render: (row: PgInServiceApplicantRow) => (
                    <span className="font-semibold text-primary">
                      {row.meritScore.toFixed(2)}%
                    </span>
                  ),
                },
              ]}
              data={group.applicants}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderFeePayment = () => {
    if (!feeResult || feeResult.collections.length === 0)
      return (
        <div className="py-12 text-center text-gray-500">
          No records found for the selected filters.
        </div>
      );

    const { summary } = feeResult;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 mb-2 md:grid-cols-3">
          {[
            {
              label: "Total Records",
              value: summary.totalApplications,
              color: "text-gray-800",
            },
            {
              label: "Total Collected",
              value: `₹${(summary.totalCollected ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
              color: "text-green-700",
            },
            {
              label: "Total Pending",
              value: `₹${(summary.totalPending ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
              color: "text-red-600",
            },
          ].map((s) => (
            <div key={s.label} className="p-4 text-center border border-gray-200 rounded-lg bg-gray-50">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
        <Table
          columns={[
            { header: "Sl", accessor: "sl" as const },
            {
              header: "App No.",
              accessor: "appNo" as const,
              render: (row: FeeCollectionRow) => (
                <span className="font-mono text-xs text-blue-700">
                  {row.appNo ?? "—"}
                </span>
              ),
            },
            { header: "Name", accessor: "name" as const },
            {
              header: "Fee Type",
              accessor: "feeType" as const,
              render: (row: FeeCollectionRow) => row.feeType ?? "—",
            },
            {
              header: "Amount (₹)",        // ← NEW: fee structure amount
              accessor: "feeStructureAmount" as const,
              render: (row: FeeCollectionRow) => (
                <span className="text-gray-700">
                  {row.feeStructureAmount > 0
                    ? `₹${row.feeStructureAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                    : "—"}
                </span>
              ),
            },
            {
              header: "Platform Fee",
              accessor: "platformFee" as const,
              render: (row: FeeCollectionRow) => (
                <span className="text-gray-600">
                  {row.platformFee > 0
                    ? `₹${row.platformFee.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                    : "—"}
                </span>
              ),
            },
            {
              header: "Paid (₹)",
              accessor: "paidAmount" as const,
              render: (row: FeeCollectionRow) => (
                <span className="font-semibold text-green-700">
                  {row.paidAmount > 0
                    ? `₹${row.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                    : "—"}
                </span>
              ),
            },
            {
              header: "Balance",
              accessor: "balance" as const,
              render: (row: FeeCollectionRow) => (
                <span className={row.balance > 0 ? "font-semibold text-red-600" : "text-gray-400"}>
                  {row.balance > 0
                    ? `₹${row.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                    : "—"}
                </span>
              ),
            },
            {
              header: "Receipt No.",       // ← NEW
              accessor: "receiptNumber" as const,
              render: (row: FeeCollectionRow) => (
                <span className="font-mono text-xs">{row.receiptNumber ?? "—"}</span>
              ),
            },
            {
              header: "Paid Date",
              accessor: "paymentDate" as const,
              render: (row: FeeCollectionRow) => row.paymentDate ?? "—",
            },
            {
              header: "Status",
              accessor: "status" as const,
              render: (row: FeeCollectionRow) => <StatusBadge status={row.status} />,
            },
            {
              header: "Settlement Date",
              accessor: "settlementDate" as const,
              render: (row: FeeCollectionRow) => row.settlementDate ?? "—",
            },
            {
              header: "Settlement ID",
              accessor: "settlementId" as const,
              render: (row: FeeCollectionRow) => (
                <span className="font-mono text-xs">{row.settlementId ?? "—"}</span>
              ),
            },
          ]}
          data={feeResult.collections}
        />
      </div>
    );
  };

  /* ── Manual Fee render ── */
  const renderManualFeeReport = () => {
    if (!manualFeeResult || manualFeeResult.collections.length === 0)
      return (
        <div className="py-12 text-center text-gray-500">
          No records found for the selected filters.
        </div>
      );

    const { summary } = manualFeeResult;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 mb-2 md:grid-cols-3">
          {[
            {
              label: "Total Records",
              value: summary.totalRecords,
              color: "text-gray-800",
            },
            {
              label: "Total Collected",
              value: `₹${(summary.totalCollected ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
              color: "text-green-700",
            },
          ].map((s) => (
            <div key={s.label} className="p-4 text-center border border-gray-200 rounded-lg bg-gray-50">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
        <Table
          columns={[
            { header: "Sl", accessor: "sl" as const },
            {
              header: "App No.",
              accessor: "appNo" as const,
              render: (row: ManualFeeCollectionRow) => (
                <span className="font-mono text-xs text-blue-700">
                  {row.appNo ?? "—"}
                </span>
              ),
            },

            { header: "Fee Name", accessor: "feeName" as const },
            {
              header: "Amount",
              accessor: "feeAmount" as const,
              render: (row: ManualFeeCollectionRow) => (
                <span className="font-semibold text-green-700">
                  {row.feeAmount > 0
                    ? `₹${row.feeAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                    : "—"}
                </span>
              ),
            },
            {
              header: "Mode",
              accessor: "paymentMode" as const,
              render: (row: ManualFeeCollectionRow) => row.paymentMode ?? "—",
            },
            {
              header: "Transaction ID",
              accessor: "transactionId" as const,
              render: (row: ManualFeeCollectionRow) => (
                <span className="font-mono text-xs">{row.transactionId ?? "—"}</span>
              ),
            },
            {
              header: "Receipt No.",
              accessor: "receiptNo" as const,
            },
            {
              header: "Date",
              accessor: "paymentDate" as const,
              render: (row: ManualFeeCollectionRow) => row.paymentDate ?? "—",
            },
          ]}
          data={manualFeeResult.collections}
        />
      </div>
    );
  };

  const renderFacilityReport = () => {
    if (!facilityResult || facilityResult.rows.length === 0)
      return (
        <div className="py-12 text-center text-gray-500">
          No records found for the selected filters.
        </div>
      );

    const { totalMale, totalFemale, totalOther, rows } = facilityResult;
    const facilityLabel = selectedReportType === "OPtedHostel" ? "Hostel" : "Transport";

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 mb-2 md:grid-cols-4">
          {[
            { label: "Total", value: rows.length, color: "text-gray-800" },
            { label: "Male", value: totalMale, color: "text-blue-700" },
            { label: "Female", value: totalFemale, color: "text-purple-700" },
            { label: "Other", value: totalOther, color: "text-amber-700" },
          ].map((s) => (
            <div key={s.label} className="p-4 text-center border border-gray-200 rounded-lg bg-gray-50">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
        <Table
          columns={[
            { header: "Sl", accessor: "sl" as const },
            { header: "App No.", accessor: "appNo" as const },
            { header: "Name", accessor: "name" as const },
            { header: "Father", accessor: "fatherName" as const },
            {
              header: "Gender",
              accessor: "gender" as const,
              render: (row: FacilityReportRow) => (
                <StatusBadge status={row.gender} />
              ),
            },
            { header: "Category", accessor: "category" as const },
            { header: "Degree", accessor: "degreeName" as const },
            { header: "Course", accessor: "courseName" as const },
            {
              header: "Phone",
              accessor: "phone" as const,
              render: (row: FacilityReportRow) => row.phone ?? "—",
            },
            {
              header: `${facilityLabel} Opted`,
              accessor: (selectedReportType === "OPtedHostel"
                ? "hostelFacility"
                : "transportFacility") as keyof FacilityReportRow,
              render: (row: FacilityReportRow) => {
                const opted =
                  selectedReportType === "OPtedHostel"
                    ? row.hostelFacility
                    : row.transportFacility;
                return (
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${opted
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-500"
                      }`}
                  >
                    {opted ? "Yes" : "No"}
                  </span>
                );
              },
            },
            {
              header: "Status",
              accessor: "verificationStatus" as const,
              render: (row: FacilityReportRow) => (
                <StatusBadge status={row.verificationStatus} />
              ),
            },
          ]}
          data={rows}
        />
      </div>
    );
  };

  const getReportContent = () => {
    if (!reportGenerated) return null;
    switch (selectedReportType) {
      case "document-verification": return renderDocumentVerification();
      case "merit-list": return renderMeritList();
      case "selected-list": return renderSelectedList();
      case "pg-inservice": return renderPgInServiceList();
      case "fee-payment": return renderFeePayment();
      case "manual-fee": return renderManualFeeReport();
      case "admitted-students": return renderAdmittedStudents();
      case "OptedTransport":
      case "OPtedHostel": return renderFacilityReport();
      default:
        return (
          <div className="py-12 text-center text-gray-500">
            Report data not available yet.
          </div>
        );
    }
  };



  const renderFilterChips = () => {
    const hasFilters = Object.entries(filters).some(([, v]) => v.length > 0);
    if (!hasFilters) return null;

    const chipConfig: {
      key: string;
      label: string;
      color: string;
      resolve?: (id: string) => string;
    }[] = [
        {
          key: "category",
          label: "Category",
          color: "blue",
          resolve: (id) => categories.find((c) => c.id === id)?.name ?? id,
        },
        {
          key: "seatType",
          label: "Seat Type",
          color: "green",
          resolve: (id) => seatTypes.find((s) => s.id === id)?.name ?? id,
        },
        {
          key: "gender",
          label: "Gender",
          color: "pink",
          resolve: (id) => genders.find((g) => g.id === id)?.name ?? id,
        },
        {
          key: "admitStatus",
          label: "Admit Status",
          color: "green",
          resolve: (val) => (val === "admitted" ? "Admitted" : "Not Admitted"),
        },
        { key: "type", label: "Type", color: "purple" },
        { key: "status", label: "Status", color: "orange" },
      ];

    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {chipConfig.map(({ key, label, color, resolve }) =>
          filters[key]?.map((val) => {
            const display = resolve ? resolve(val) : val;
            return (
              <span
                key={`${key}-${val}`}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-${color}-50 text-${color}-700 border border-${color}-200`}
              >
                {label}: {display}
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      [key]: prev[key]?.filter((v) => v !== val) ?? [],
                    }))
                  }
                  className={`ml-1 hover:text-${color}-900`}
                >
                  ×
                </button>
              </span>
            );
          })
        )}
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  REPORT INFO BAR                                                     */
  /* ------------------------------------------------------------------ */

  const renderReportInfoBar = () => {
    const selectedCategoryNames = (filters.category ?? []).map(
      (id) => categories.find((c) => c.id === id)?.name ?? id
    );
    const selectedSeatTypeNames = (filters.seatType ?? []).map(
      (id) => seatTypes.find((s) => s.id === id)?.name ?? id
    );
    const selectedGenderNames = (filters.gender ?? []).map(
      (id) => genders.find((g) => g.id === id)?.name ?? id
    );


    type Chip = { label: string; value: string; color: string };
    const chips: Chip[] = [];

    const selectedDegreeTypeName =
      degreeTypes.find(dt => dt.id === selectedDegreeTypeId)?.name;
    if (selectedDegreeTypeName && !isCertificateCourse)
      chips.push({ label: "Degree Type", value: selectedDegreeTypeName, color: "indigo" });

    const requiresDegreeCourse =
      selectedReportType !== "pg-inservice" &&
      (!isPG || selectedReportType === "merit-list" || selectedReportType === "selected-list");
    if (requiresDegreeCourse && selectedDegreeName)
      chips.push({ label: isCertificateCourse ? "Program" : "Degree", value: selectedDegreeName, color: "indigo" });
    if (requiresDegreeCourse && selectedCourseName)
      chips.push({ label: "Course", value: selectedCourseName, color: "indigo" });
    if (selectedAcademicYearName)
      chips.push({ label: "Academic Year", value: selectedAcademicYearName, color: "indigo" });
    if (selectedFeeType)
      chips.push({ label: "Fee Type", value: selectedFeeType, color: "teal" });
    if (selectedCategoryNames.length)
      chips.push({ label: "Category", value: selectedCategoryNames.join(", "), color: "blue" });
    if (selectedSeatTypeNames.length)
      chips.push({ label: "Seat Type", value: selectedSeatTypeNames.join(", "), color: "green" });
    if (selectedGenderNames.length)
      chips.push({ label: "Gender", value: selectedGenderNames.join(", "), color: "pink" });

    if ((filters.type ?? []).length)
      chips.push({ label: "Type", value: (filters.type ?? []).join(", "), color: "purple" });
    if ((filters.status ?? []).length)
      chips.push({ label: "Status", value: (filters.status ?? []).join(", "), color: "orange" });

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {chips.map(({ label, value, color }) => (
          <span
            key={`${label}-${value}`}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-${color}-50 text-${color}-700 border border-${color}-200`}
          >
            <span className="font-semibold">{label}:</span> {value}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
          <span className="font-semibold">Records:</span> {recordCount()}
        </span>
      </div>
    );
  };


  return (
    <AppLayout pageTitle="Reports">
      <div data-testid="reports-page" className="pb-8 space-y-6">

        <div>
          <h1 className="text-3xl font-bold text-text">Reports</h1>
          <p className="mt-2 text-gray-600">
            Generate detailed reports for merit list, document verification,
            fee payment, manual fee collection, admitted students, hostel and transport.
          </p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <h2 className="mb-6 text-lg font-semibold text-text">
            Generate Report
          </h2>

          {/* ── Report Type selector ── */}
          <div className="mb-6">
            <label className="block mb-3 text-sm font-semibold text-gray-600">
              Report Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(Object.entries(REPORT_LABELS) as [ReportType, string][]).map(
                ([id, label]) => (
                  <button
                    key={id}
                    onClick={() => switchReportType(id)}
                    className={`p-4 rounded-lg border-2 transition text-left ${selectedReportType === id
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-primary"
                      }`}
                  >
                    <p className="font-semibold text-text">{label}</p>
                  </button>
                )
              )}
            </div>
          </div>

          <div className="pt-6 border-t">
            <div className="flex flex-col items-end gap-4 mb-6 md:flex-row">

              <div
                className={`grid grid-cols-1 gap-6 flex-1 ${needsFeeType(selectedReportType) || needsDegreeType(selectedReportType)
                    ? "md:grid-cols-4"
                    : "md:grid-cols-3"
                  }`}
              >


                {needsDegreeType(selectedReportType) && (
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-600">
                      Degree Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedDegreeTypeId}
                      onChange={(e) => handleDegreeTypeChange(e.target.value)}
                      disabled={loadingDegreeTypes}
                      className="w-full px-4 py-2.5 rounded-lg border disabled:opacity-50"
                    >
                      <option value="">{loadingDegreeTypes ? "Loading..." : "Select Degree Type"}</option>
                      {degreeTypes.map((dt) => (
                        <option key={dt.id} value={dt.id}>{dt.name}</option>
                      ))}
                    </select>
                  </div>
                )}


                {selectedReportType !== "pg-inservice" &&
                  (!isPG || selectedReportType === "merit-list" || selectedReportType === "selected-list") && (
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-600">
                        Degree <span className="text-red-500">*</span>
                      </label>
                    <select
                      value={selectedDegreeId}
                      onChange={(e) => {
                        setSelectedDegreeId(e.target.value);
                        setSelectedCourseId("");
                        setReportGenerated(false);
                      }}
                      disabled={loadingDegrees}
                      className="w-full px-4 py-2.5 rounded-lg border disabled:opacity-50"
                    >
                      <option value="">
                        {loadingDegrees
                          ? "Loading..."
                          : needsDegreeType(selectedReportType) && !selectedDegreeTypeId
                            ? "Select Degree Type first"
                            : "Select Degree"}
                      </option>
                      {filteredDegrees.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.degreeName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}


                {selectedReportType !== "pg-inservice" &&
                  (!isPG || selectedReportType === "merit-list" || selectedReportType === "selected-list") && (
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-600">
                        Course <span className="text-red-500">*</span>
                      </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => {
                        setSelectedCourseId(e.target.value);
                        setReportGenerated(false);
                      }}
                      disabled={loadingCourses}
                      className="w-full px-4 py-2.5 rounded-lg border disabled:opacity-50"
                    >
                      <option value="">
                        {loadingCourses
                          ? "Loading..."
                          : !selectedDegreeId
                            ? "Select Degree first"
                            : "Select Course"}
                      </option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Academic Year */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-600">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedAcademicYearId}
                    onChange={(e) => {
                      setSelectedAcademicYearId(e.target.value);
                      setReportGenerated(false);
                    }}
                    disabled={loadingAcademicYears}
                    className="w-full px-4 py-2.5 rounded-lg border disabled:opacity-50"
                  >
                    <option value="">
                      {loadingAcademicYears ? "Loading..." : "Select Academic Year"}
                    </option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.description ?? ay.id}
                      </option>
                    ))}
                  </select>
                </div>

                {needsFeeType(selectedReportType) && (
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-600">
                      Fee Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedFeeType}
                      onChange={(e) => {
                        setSelectedFeeType(e.target.value);
                        setReportGenerated(false);
                      }}
                      className="w-full px-4 py-2.5 rounded-lg border"
                    >
                      <option value="">Select Fee Type</option>
                      {(FEE_TYPE_OPTIONS[selectedReportType] ?? []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>


              {showFilterPanel(selectedReportType) && (
                <div className="flex justify-end">
                  <FilterPanel
                    sections={
                      loadingLookups
                        ? activeFilterSections.map((s) => ({ ...s, options: [] }))
                        : activeFilterSections
                    }
                    values={filters}
                    onChange={(key, val) =>
                      setFilters((prev) => ({ ...prev, [key]: val }))
                    }
                  />
                </div>
              )}
            </div>

            {renderFilterChips()}

            {reportError && (
              <div className="p-3 mb-4 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">
                {reportError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw size={18} /> Reset
              </Button>
              <Button
                variant="primary"
                onClick={handleGenerateReport}
                disabled={loadingReport}
              >
                <Eye size={18} />
                {loadingReport ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Generated report ── */}
        {reportGenerated && (
          <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-text">
                  {REPORT_LABELS[selectedReportType]} Report
                </h2>
                {renderReportInfoBar()}
              </div>
              {showDownload && (
                <Button
                  variant="secondary"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="shrink-0"
                >
                  <Download size={18} />
                  {downloading ? "Downloading..." : "Download PDF"}
                </Button>
              )}
            </div>
            <div className="pt-6 overflow-hidden border border-t border-gray-200 rounded-lg">
              {getReportContent()}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!reportGenerated && !loadingReport && (
          <div className="p-12 text-center bg-white border border-gray-200 rounded-lg">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="mb-2 text-lg font-semibold text-gray-700">
              No report generated yet
            </h3>
            <p className="text-gray-500">
              Select a report type and filters above, then click "Generate Report"
            </p>
          </div>
        )}

        {/* ── Loading state ── */}
        {loadingReport && (
          <div className="p-12 text-center bg-white border border-gray-200 rounded-lg">
            <RefreshCw size={36} className="mx-auto mb-4 text-primary animate-spin" />
            <p className="text-gray-600">Generating report...</p>
          </div>
        )}

        {/* ── Toast ── */}
        {toast && (
          <div className="fixed z-50 top-5 right-5">
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}