using Microsoft.AspNetCore.Mvc;
using QuestPDF.Fluent;

using UniversitySystem.Application.Interfaces.Application;
using UniversitySystem.Application.Dtos.Application;

[ApiController]
[Route("api/[controller]")]
public class ReportController : ControllerBase
{
    private readonly IApplicationQueryService _queryService;
    private readonly IApplicationPhotoService _photoService;
    private readonly IFileService _fileService;

    private readonly ILookupService _lookupService;
    private readonly IDegreeService _degreeService;
    private readonly ICourseService _courseService;
    private readonly IApplicationVerificationService _verificationService;
    private readonly IAcademicYearService _academicYearService;
    private readonly IAdmissionFeeStructureService _feeStructureService;
    private readonly IFeeCollectionService _feeCollectionService;
    private readonly ICurrentUserService _currentUser;
    private readonly IRegistrationService _registrationService;

    private readonly IAdmittedStudentService _admittedStudentService;
    private readonly IApplicationDocumentService _documentService;
    private readonly IFeeCollectionManualService _manualFeeService;

    private readonly IExamApplicationService _examApplicationService;
    private readonly ISubjectService _subjectService;

    private readonly ICourseSubjectService _courseSubjectService;

    private readonly IPgEducationService _pgEducationService;


    public ReportController(
        IApplicationQueryService queryService,
        IApplicationPhotoService photoService,
        IFileService fileService,
        IHttpClientFactory httpClientFactory,
        ILookupService lookupService,
        IDegreeService degreeService,
        ICourseService courseService,
        IApplicationVerificationService verificationService,
        IAcademicYearService academicYearService,
        IFeeCollectionService feeCollectionService,
        IAdmissionFeeStructureService admissionFeeStructureService,
        ICurrentUserService currentUserService,
        IRegistrationService registrationService,
        IAdmittedStudentService admittedStudentService,
        IApplicationDocumentService documentService,
        IFeeCollectionManualService feeCollectionManualService,
        IExamApplicationService examApplicationService,
        ISubjectService subjectService,
        ICourseSubjectService courseSubjectService,
        IPgEducationService pgEducationService)
    {
        _queryService = queryService;
        _photoService = photoService;
        _fileService = fileService;
        _feeCollectionService = feeCollectionService;
        _lookupService = lookupService;
        _degreeService = degreeService;
        _courseService = courseService;
        _verificationService = verificationService;
        _academicYearService = academicYearService;
        _feeStructureService = admissionFeeStructureService;
        _feeCollectionService = feeCollectionService;
        _currentUser = currentUserService;
        _admittedStudentService = admittedStudentService;
        _documentService = documentService;
        _manualFeeService = feeCollectionManualService;
        _examApplicationService = examApplicationService;
        _subjectService = subjectService;
        _courseSubjectService = courseSubjectService;
        _registrationService = registrationService;
        _pgEducationService = pgEducationService;
    }

    private async Task<IActionResult> BuildApplicationPdfResponseAsync(
    ApplicationFullResponseDto appData, string requestedByUsername, bool download)
    {
        var applicationId = appData.Application.Id;

        byte[]? photoBytes = null;
        var photoRecord = await _photoService.GetByApplicationIdAsync(applicationId);
        if (photoRecord?.PhotoUrl != null)
        {
            var file = await _fileService.GetAsync(photoRecord.PhotoUrl);
            if (file.HasValue) photoBytes = file.Value.fileBytes;
        }

        byte[]? signatureBytes = null;
        if (photoRecord?.SignatureUrl != null)
        {
            var file = await _fileService.GetAsync(photoRecord.SignatureUrl);
            if (file.HasValue) signatureBytes = file.Value.fileBytes;
        }

        byte[]? logoBytes = await _fileService.GetLogoBytesAsync();
        try
        {
            var file = await _fileService.GetAsync("Assets/logo.jpeg");
            if (file.HasValue) logoBytes = file.Value.fileBytes;
        }
        catch { /* optional */ }

        var lookupMap = (await _lookupService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.Name ?? x.Code ?? x.Id.ToString());
        var degreeMap = (await _degreeService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.DegreeName ?? x.Id.ToString());
        var courseMap = (await _courseService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.Name ?? x.Id.ToString());
        var academicYearMap = (await _academicYearService.GetAllAsync())
            .ToDictionary(x => x.Id, x => (x.Description ?? x.Id.ToString(), x.BatchYear ?? string.Empty));

        var documents = new List<ApplicationDocumentResponseDto>();
        try { documents = await _documentService.GetByApplicationIdAsync(applicationId); }
        catch { /* optional */ }

        var registration = await _registrationService.GetByUsernameAsync(requestedByUsername);
        string? degreeTypeName = registration?.DegreeTypeId.HasValue == true &&
            lookupMap.TryGetValue(registration.DegreeTypeId.Value, out var dtName)
                ? dtName : null;

        bool isPgApplication = !string.IsNullOrWhiteSpace(degreeTypeName) &&
            degreeTypeName.Contains("PG", StringComparison.OrdinalIgnoreCase);

        List<PgEducationDetailDto>? pgEducationDetails = null;
        if (isPgApplication)
            pgEducationDetails = (await _pgEducationService.GetByApplicationIdAsync(applicationId)).ToList();

        var reportData = new ApplicationReportData
        {
            Application = appData.Application,
            EducationDetails = appData.EducationDetails,
            CourseDetails = appData.CourseDetails,
            SeatTypes = appData.SeatTypes,
            DegreeTypeName = degreeTypeName,
            PgEducationDetails = pgEducationDetails,
            Documents = documents,
            LookupMap = lookupMap,
            DegreeMap = degreeMap,
            CourseMap = courseMap,
            AcademicYearMap = academicYearMap,
            PhotoBytes = photoBytes,
            SignatureBytes = signatureBytes,
            LogoBytes = logoBytes
        };

        var pdfBytes = new ApplicationReport(reportData).GeneratePdf();

        var firstDegreeId = appData.CourseDetails?.FirstOrDefault()?.DegreeId;
        var firstDegreeName = firstDegreeId.HasValue && degreeMap.TryGetValue(firstDegreeId.Value, out var fdName)
            ? fdName : "";
        bool isCertificationCourse = firstDegreeName.Contains("Certificat", StringComparison.OrdinalIgnoreCase);
        string fileNamePrefix = isCertificationCourse ? "CertificationCourseReport" : "ApplicationReport";

        return download
            ? File(pdfBytes, "application/pdf", $"{fileNamePrefix}_{appData.Application.AppNo}.pdf")
            : File(pdfBytes, "application/pdf");
    }
    [HttpGet("application-pdf")]
    public async Task<IActionResult> GenerateMyApplicationPdf([FromQuery] bool download = false)
    {
        try
        {
            var username = _currentUser.Username;
            if (string.IsNullOrWhiteSpace(username))
                return Unauthorized(new { message = "User not authenticated." });

            var appData = await _queryService.GetMyApplicationAsync(username);
            if (appData?.Application == null)
                return NotFound(new { message = "Application not found" });

            return await BuildApplicationPdfResponseAsync(appData, username, download);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error generating PDF", error = ex.Message });
        }
    }

    [HttpGet("application-pdf-admin")]
    public async Task<IActionResult> GenerateApplicationPdf(
        [FromQuery] string appNo, [FromQuery] bool download = false)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(appNo))
                return BadRequest(new { message = "Application number is required" });

            var appData = await _queryService.GetByAppNoAsync(appNo);
            if (appData?.Application == null)
                return NotFound(new { message = "Application not found" });

            return await BuildApplicationPdfResponseAsync(appData, appData.Application.InsertBy, download);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error generating PDF", error = ex.Message });
        }
    }
    [HttpGet("document-verification-list")]
    public async Task<IActionResult> GetDocumentVerificationList(
    [FromQuery] string? degreeId = null,
    [FromQuery] string? courseId = null,
    [FromQuery] string? academicYearId = null,
    [FromQuery] string? category = null,
    [FromQuery] string? seatType = null,
    [FromQuery] string? karnataka = null,
    [FromQuery] string? status = null,
    [FromQuery] string format = "json",
    [FromQuery] bool download = false)
    {
        try
        {
            var rows = await BuildVerificationRowsAsync(
                degreeId, courseId, academicYearId, category, seatType, karnataka, status);

            if (format.Equals("pdf", StringComparison.OrdinalIgnoreCase))
            {
                byte[]? logoBytes = await _fileService.GetLogoBytesAsync();

                var degreeMap = (await _degreeService.GetAllAsync()).ToDictionary(x => x.Id, x => x.DegreeName ?? x.Id.ToString());
                var courseMap = (await _courseService.GetAllAsync()).ToDictionary(x => x.Id, x => x.Name ?? x.Id.ToString());

                string degreeName = Guid.TryParse(degreeId, out var dGuid) && degreeMap.TryGetValue(dGuid, out var dn) ? dn : "";
                string courseName = Guid.TryParse(courseId, out var cGuid) && courseMap.TryGetValue(cGuid, out var cn) ? cn : "";
                string academicYearName = await ResolveAcademicYearNameAsync(academicYearId);

                string? categoryDisplay = !string.IsNullOrWhiteSpace(category)
                    ? string.Join(", ", category.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                    : null;

                string? seatTypeDisplay = !string.IsNullOrWhiteSpace(seatType)
                    ? string.Join(", ", seatType.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                    : null;

                string? karnatakaDisplay = !string.IsNullOrWhiteSpace(karnataka)
                    ? string.Join(", ", karnataka.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                    : null;

                string? statusDisplay = !string.IsNullOrWhiteSpace(status)
                    ? string.Join(", ", status.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                    : null;

                var reportData = new DocumentVerificationReportData
                {
                    Rows = rows,
                    LogoBytes = logoBytes,
                    DegreeName = degreeName,
                    CourseName = courseName,
                    AcademicYear = !string.IsNullOrWhiteSpace(academicYearName) ? academicYearName : "2026–27",
                    AcademicYearName = !string.IsNullOrWhiteSpace(academicYearName) ? academicYearName : null,
                    CategoryFilter = categoryDisplay,
                    SeatTypeFilter = seatTypeDisplay,
                    KarnatakaFilter = karnatakaDisplay,
                    StatusFilter = statusDisplay,
                };

                var pdfBytes = new DocumentVerificationReport(reportData).GeneratePdf();

                return download
                    ? File(pdfBytes, "application/pdf", $"DocumentVerificationReport_{DateTime.Now:yyyyMMddHHmmss}.pdf")
                    : File(pdfBytes, "application/pdf");
            }

            return Ok(rows.Select(r => new
            {
                sl = r.Sl,
                appNo = r.AppNo,
                name = r.Name,
                category = r.Category,
                seatType = r.SeatTypes,
                karnataka = r.Karnataka,
                status = r.Status,
                remark = r.Remark
            }));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching document verification report", error = ex.Message });
        }
    }

    private static string NormalizeCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category)) return "";

        var value = category.ToUpper()
            .Replace("(", "")
            .Replace(")", "")
            .Replace(" ", "")
            .Replace("-", "");

        return value switch
        {
            "2A" => "IIA",
            "2B" => "IIB",
            "3A" => "IIIA",
            "3B" => "IIIB",
            _ => value
        };
    }


    private static bool SafeBool(object? val)
    {
        try { return val != null && Convert.ToBoolean(val); }
        catch { return false; }
    }

    private static bool ContainsAny(string? source, params string[] keywords)
    {
        if (string.IsNullOrWhiteSpace(source)) return false;
        var lower = source.ToLower();
        return keywords.Any(k => lower.Contains(k));
    }
    private static float ResolvePgQualifyingPercentage(IEnumerable<PgEducationDetailDto> pgDetails)
    {
        if (pgDetails == null) return -1f;

        var valid = new List<float>();

        foreach (var d in pgDetails)
        {
            float pct = 0f;
            try
            {
                pct = Convert.ToSingle(d.Percentage);
            }
            catch
            {
                pct = 0f;
            }

            if (pct > 0) valid.Add(pct);
        }

        return valid.Any() ? valid.Max() : -1f;
    }
    private static float ResolvePgOverallPercentage(IEnumerable<PgEducationDetailDto> pgDetails)
    {
        if (pgDetails == null) return -1f;

        var valid = pgDetails
            .Where(d => d.OverallPercentage.HasValue && d.OverallPercentage.Value > 0)
            .Select(d => (float)d.OverallPercentage.Value)
            .ToList();

        return valid.Any() ? valid.Max() : -1f;
    }

    private static int ParsePreferenceRank(string? preference)
    {
        if (string.IsNullOrWhiteSpace(preference)) return 0;
        var digits = new string(preference.Where(char.IsDigit).ToArray());
        return int.TryParse(digits, out var n) ? n : 0;
    }
    private static (float Percentage, string Label) ResolveTwelfthOrDiplomaSummary(IEnumerable<dynamic> educationDetails)
    {
        static float SafePct(dynamic e)
        {
            try { object raw = e.Percentage; return raw == null ? 0f : Convert.ToSingle(raw); }
            catch { return 0f; }
        }

        static string SafeName(dynamic e)
        {
            try
            {
                object? val = null;
                try { val = e.ExamName; } catch { }
                if (val == null) try { val = e.QualificationName; } catch { }
                if (val == null) try { val = e.Qualification; } catch { }
                if (val == null) try { val = e.CourseName; } catch { }
                if (val == null) try { val = e.Level; } catch { }
                return val?.ToString()?.ToLower() ?? "";
            }
            catch { return ""; }
        }

        var edu = educationDetails
            .Select(e => new { Name = SafeName(e), Pct = SafePct(e) })
            .Where(e => e.Pct > 0)
            .ToList();

        if (!edu.Any()) return (-1f, "—");

        bool LooksLikeTenth(string name) =>
            name.Contains("10th") || name.Contains("sslc") || name.Contains("ssc") ||
            name.Contains("matriculation") || (name.Contains("10") && !name.Contains("+2"));

        var twelfth = edu.Where(e =>
            !LooksLikeTenth(e.Name) &&
            (e.Name.Contains("12") || e.Name.Contains("puc") || e.Name.Contains("hsc") ||
             e.Name.Contains("+2") || e.Name.Contains("intermediate")))
            .Select(e => e.Pct).ToList();

        var diploma = edu.Where(e => !LooksLikeTenth(e.Name) && e.Name.Contains("diploma"))
            .Select(e => e.Pct).ToList();

        float twelfthMax = twelfth.Any() ? twelfth.Max() : -1f;
        float diplomaMax = diploma.Any() ? diploma.Max() : -1f;

        float percentage = twelfthMax >= 0 && diplomaMax >= 0 ? Math.Max(twelfthMax, diplomaMax)
            : twelfthMax >= 0 ? twelfthMax
            : diplomaMax >= 0 ? diplomaMax
            : -1f;

        string label = twelfthMax >= 0 && diplomaMax >= 0 ? (twelfthMax >= diplomaMax ? "PUC" : "Diploma")
            : twelfthMax >= 0 ? "PUC"
            : diplomaMax >= 0 ? "Diploma"
            : "—";

        return (percentage, label);
    }
    
    private static float ResolveQualifyingPercentage(IEnumerable<dynamic> educationDetails)
    {
        static float SafePct(dynamic e)
        {
            try
            {
                object raw = e.Percentage;
                if (raw == null) return 0f;
                return Convert.ToSingle(raw);
            }
            catch { return 0f; }
        }

        static string SafeName(dynamic e)
        {
            try
            {
                object? val = null;
                try { val = e.ExamName; } catch { }
                if (val == null) try { val = e.QualificationName; } catch { }
                if (val == null) try { val = e.Qualification; } catch { }
                if (val == null) try { val = e.CourseName; } catch { }
                if (val == null) try { val = e.Level; } catch { }

                return val?.ToString()?.ToLower() ?? "";
            }
            catch { return ""; }
        }

        var edu = educationDetails
            .Select(e => new { Name = SafeName(e), Pct = SafePct(e) })
            .Where(e => e.Pct > 0)
            .ToList();

        if (!edu.Any()) return -1f;

        var twelfth = edu.Where(e =>
            e.Name.Contains("12") ||
            e.Name.Contains("puc") ||
            e.Name.Contains("hsc") ||
            e.Name.Contains("+2") ||
            e.Name.Contains("intermediate"))
            .Select(e => e.Pct)
            .ToList();

        var diploma = edu.Where(e =>
            e.Name.Contains("diploma"))
            .Select(e => e.Pct)
            .ToList();


        if (twelfth.Any() && diploma.Any())
            return Math.Max(twelfth.Max(), diploma.Max());


        if (twelfth.Any()) return twelfth.Max();


        if (diploma.Any()) return diploma.Max();


        return -1f;
    }


    private static bool PassesKarnatakaFilter(string? karnataka, StudentType studentType)
    {
        if (string.IsNullOrWhiteSpace(karnataka))
            return true;


        var filters = karnataka
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(f => f.Trim().ToUpper())
            .ToList();


        string current = studentType switch
        {
            StudentType.HyderabadKarnataka => "HK",
            StudentType.NonKarnataka => "NK",
            _ => "KA"
        };

        return filters.Contains(current);
    }
    [HttpGet("merit-list")]
    public async Task<IActionResult> GetMeritList(
            [FromQuery] string? degreeTypeId = null,
        [FromQuery] string? degreeId = null,
        [FromQuery] string? courseId = null,
        [FromQuery] string? academicYearId = null,
        [FromQuery] string? category = null,
        [FromQuery] string? seatType = null,
        [FromQuery] string? karnataka = null,
        [FromQuery] string? listType = "all",
        [FromQuery] bool download = false)
    {
        try
        {
            var result = await BuildAllMeritListsAsync(
         degreeTypeId, degreeId, courseId, academicYearId, category, seatType, karnataka, listType);

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching merit list", error = ex.Message });
        }
    }


    [HttpGet("merit-list-pdf")]
    public async Task<IActionResult> GenerateMeritListPdf(
         [FromQuery] string? degreeTypeId = null,
        [FromQuery] string? degreeId = null,
        [FromQuery] string? courseId = null,
        [FromQuery] string? academicYearId = null,
        [FromQuery] string? category = null,
        [FromQuery] string? seatType = null,
        [FromQuery] string? karnataka = null,
        [FromQuery] string? listType = "omnibus",
        [FromQuery] bool download = false)
    {
        try
        {
            var (pdfBytes, fileName) = await BuildMeritListPdfAsync(
        degreeTypeId, degreeId, courseId, academicYearId, category, seatType, karnataka, listType);

            return download
                ? File(pdfBytes, "application/pdf", fileName)
                : File(pdfBytes, "application/pdf");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error generating Merit List PDF", error = ex.Message });
        }
    }
    [HttpGet("selected-list")]
    public async Task<IActionResult> GetSelectedList(
    [FromQuery] string? degreeTypeId = null,
    [FromQuery] string? degreeId = null,
    [FromQuery] string? courseId = null,
    [FromQuery] string? academicYearId = null,
    [FromQuery] string? category = null,
    [FromQuery] string format = "json",
    [FromQuery] bool download = false)
    {
        try
        {
            var (rows, displayAcademicYear, degreeName, courseName) =
                await BuildSelectedListDataAsync(degreeTypeId, degreeId, courseId, academicYearId, category);

            if (format.Equals("pdf", StringComparison.OrdinalIgnoreCase))
            {
                byte[]? logoBytes = await _fileService.GetLogoBytesAsync();

                var reportData = new SelectedListReportData
                {
                    Rows = rows,
                    LogoBytes = logoBytes,
                    AcademicYear = displayAcademicYear,
                    DegreeName = degreeName,
                    CourseName = courseName,
                    CategoryFilter = category,
                    ReportTitle = "Selected List"
                };

                var pdfBytes = new SelectedListReport(reportData).GeneratePdf();

                return download
                    ? File(pdfBytes, "application/pdf", $"SelectionList_{degreeName}.pdf")
                    : File(pdfBytes, "application/pdf");
            }

            return Ok(rows.Select(r => new
            {
                sl = r.Rank,
                appNo = r.AppNo,
                name = r.Name,
                category = r.Category,
                qualification = r.Qualification,
                meritScore = r.MeritScore,
            }));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching Selected List", error = ex.Message });
        }
    }

    private async Task<(List<MeritListReportRow> rows, string academicYear, string degreeName, string courseName)>
        BuildSelectedListDataAsync(
            string? degreeTypeId, string? degreeId, string? courseId,
            string? academicYearId, string? category)
    {
        var degreeMap = (await _degreeService.GetAllAsync()).ToDictionary(x => x.Id, x => x.DegreeName ?? x.Id.ToString());
        var courseMap = (await _courseService.GetAllAsync()).ToDictionary(x => x.Id, x => x.Name ?? x.Id.ToString());

        string degreeName = Guid.TryParse(degreeId, out var dGuid) && degreeMap.TryGetValue(dGuid, out var dn) ? dn : "";
        string courseName = Guid.TryParse(courseId, out var cGuid) && courseMap.TryGetValue(cGuid, out var cn) ? cn : "";

        string? degreeTypeName = null;
        if (Guid.TryParse(degreeTypeId, out var dtGuid))
        {
            var typeLookupMap = (await _lookupService.GetAllAsync())
                .ToDictionary(x => x.Id, x => x.Name ?? x.Code ?? x.Id.ToString());
            typeLookupMap.TryGetValue(dtGuid, out degreeTypeName);
        }
        bool isPgProgramme = !string.IsNullOrWhiteSpace(degreeTypeName) &&
            degreeTypeName.Contains("Postgraduate (PG)", StringComparison.OrdinalIgnoreCase);
        bool isCertificationCourse = degreeName.Contains("Certificate", StringComparison.OrdinalIgnoreCase);

        // Hardcoded per requirement — certificate courses show 2025-26, PG shows 2026-2027.
        string displayAcademicYear = isCertificationCourse
            ? "2025-26"
            : (isPgProgramme ? "2026-2027" : "2026-2027");

        var allRows = await BuildMeritRowsAsync(
            degreeTypeId, degreeId, courseId, academicYearId,
            category, seatType: null, karnataka: null,
            isCertificationCourse: isCertificationCourse);

        allRows = allRows.Where(r =>
            string.IsNullOrEmpty(category) ||
            NormalizeCategory(r.Category) == NormalizeCategory(category)
        ).ToList();
        if (isPgProgramme)
        {
            foreach (var r in allRows)
                r.Qualification = "DEGREE";
        }

        var ranked = allRows.OrderByDescending(r => r.MeritScore).ThenBy(r => r.Name).ToList();
        for (int i = 0; i < ranked.Count; i++) ranked[i].Rank = i + 1;

        return (ranked, displayAcademicYear, degreeName, courseName);
    }

    private async Task<(byte[] pdfBytes, string fileName)> BuildMeritListPdfAsync(
        string? degreeTypeId, string? degreeId, string? courseId, string? academicYearId,
        string? category, string? seatType, string? karnataka, string? listType)
    {
        byte[]? logoBytes = await _fileService.GetLogoBytesAsync();

        var degreeMap = (await _degreeService.GetAllAsync()).ToDictionary(x => x.Id, x => x.DegreeName ?? x.Id.ToString());
        var allCourses = await _courseService.GetAllAsync();
        var courseMap = allCourses.ToDictionary(x => x.Id, x => x.Name ?? x.Id.ToString());
        var courseIntakeMap = allCourses
    .Where(x => x.TotalSeats > 0)
    .ToDictionary(x => x.Id, x => x.TotalSeats);

        string degreeName = Guid.TryParse(degreeId, out var dGuid) && degreeMap.TryGetValue(dGuid, out var dn) ? dn : "";
        string courseName = Guid.TryParse(courseId, out var cGuid) && courseMap.TryGetValue(cGuid, out var cn) ? cn : "";
        string academicYearName = await ResolveAcademicYearNameAsync(academicYearId);

        string? degreeTypeName = null;
        if (Guid.TryParse(degreeTypeId, out var dtGuidEarly))
        {
            var typeLookupMapEarly = (await _lookupService.GetAllAsync())
                .ToDictionary(x => x.Id, x => x.Name ?? x.Code ?? x.Id.ToString());
            typeLookupMapEarly.TryGetValue(dtGuidEarly, out degreeTypeName);
        }
        bool isPgProgramme = !string.IsNullOrWhiteSpace(degreeTypeName) &&
            degreeTypeName.Contains("Postgraduate (PG)", StringComparison.OrdinalIgnoreCase);

        bool isCertificationCourse = degreeName.Contains("Certificate", StringComparison.OrdinalIgnoreCase);

        int ProgrammeIntake;
        if (isCertificationCourse)
        {
            ProgrammeIntake = 400;
        }
        else if (isPgProgramme && cGuid != Guid.Empty && courseIntakeMap.TryGetValue(cGuid, out var pgIntake))
        {
            ProgrammeIntake = pgIntake;
        }
        else
        {
            ProgrammeIntake = 60;
        }

        string displayAcademicYear = isCertificationCourse
        ? "2025-2026"
        : (!string.IsNullOrWhiteSpace(academicYearName) ? academicYearName : "2026–27");

        var allRows = await BuildMeritRowsAsync(
    degreeTypeId, degreeId, courseId, academicYearId, category, seatType, karnataka, isCertificationCourse);

        allRows = allRows.Where(r =>
            (string.IsNullOrEmpty(category) ||
            NormalizeCategory(r.Category) == NormalizeCategory(category))
            &&
            (string.IsNullOrEmpty(seatType) ||
            r.SeatTypes.Any(s => s.Equals(seatType, StringComparison.OrdinalIgnoreCase)))
            &&
            PassesKarnatakaFilter(karnataka, r.StudentType)
        ).ToList();

        List<MeritListReportRow> omnibus;
        var allocationSummary = new SeatAllocationSummary { TotalIntake = ProgrammeIntake };
        var categoryBreakdown = new List<CategoryBreakdownRow>();
        var categoryCutoffs = new List<CategoryCutoffRow>();
        var seatMatrixBreakdown = new List<CategorySeatMatrixRow>();
        var supernumeraryAllotments = new List<SupernumeraryAllotmentRow>();
        var certificateCutoffs = new List<CertificateCutoffRow>();
        var pgCategoryBreakdown = new List<PgProgrammeCategoryRow>();
        var pgKkAllotments = new List<PgKkAllotmentRow>();
        PgPwdAllotmentRow? pgPwdAllotment = null;
        var pgCutoffs = new List<PgCutoffRow>();
        if (isCertificationCourse)
        {
            var ranked = allRows.OrderByDescending(r => r.MeritScore).ThenBy(r => r.Name).ToList();
            for (int i = 0; i < ranked.Count; i++) ranked[i].Rank = i + 1;

            (seatMatrixBreakdown, supernumeraryAllotments) = AllocateCertificateCourseSeats(ranked);
            certificateCutoffs = BuildCertificateCutoffs(ranked);

            omnibus = ranked;
        }
        else if (isPgProgramme && PgSeatMatrixByProgramme.TryGetValue(
                     !string.IsNullOrWhiteSpace(courseName) ? courseName : degreeName,
                     out var pgMatrix))
        {
            var ranked = allRows.OrderByDescending(r => r.MeritScore).ThenBy(r => r.Name).ToList();
            for (int i = 0; i < ranked.Count; i++) ranked[i].Rank = i + 1;

            (pgCategoryBreakdown, pgKkAllotments, pgPwdAllotment) = AllocatePgCourseSeats(ranked, pgMatrix);
            pgCutoffs = BuildPgCutoffs(ranked);

            omnibus = ranked;
        }
        else
        {
            int hkSeats = (int)Math.Ceiling(ProgrammeIntake * 0.08);
            int nonKaSeats = (int)Math.Ceiling(ProgrammeIntake * 0.15);
            int daSeats = (int)Math.Ceiling(ProgrammeIntake * 0.05);
            int kaSeats = ProgrammeIntake - hkSeats - nonKaSeats - daSeats;

            var kaRows = allRows.Where(r => r.StudentType == StudentType.Karnataka)
                                .OrderByDescending(r => r.MeritScore).ThenBy(r => r.Name).ToList();
            var hkRows = allRows.Where(r => r.StudentType == StudentType.HyderabadKarnataka)
                                .OrderByDescending(r => r.MeritScore).ThenBy(r => r.Name).ToList();
            var nkRows = allRows.Where(r => r.StudentType == StudentType.NonKarnataka)
                                .OrderByDescending(r => r.MeritScore).ThenBy(r => r.Name).ToList();

            for (int i = 0; i < kaRows.Count; i++) kaRows[i].Rank = i + 1;
            for (int i = 0; i < hkRows.Count; i++) hkRows[i].Rank = i + 1;
            for (int i = 0; i < nkRows.Count; i++) nkRows[i].Rank = i + 1;

            ApplyCategoryWiseAllocation(kaRows, kaSeats);
            ApplyCategoryWiseAllocation(hkRows, hkSeats);
            ApplyCategoryWiseAllocation(nkRows, nonKaSeats);

            allocationSummary = new SeatAllocationSummary
            {
                TotalIntake = ProgrammeIntake,
                KarnatakaSeats = kaSeats,
                HyderabadKarnatakaSeats = hkSeats,
                NonKarnatakaSeats = nonKaSeats,
                DifferentlyAbledSeats = daSeats,
                KarnatakaFilled = kaRows.Count(r => r.AllocationStatus == AllocationStatus.Selected),
                HyderabadKarnatakaFilled = hkRows.Count(r => r.AllocationStatus == AllocationStatus.Selected),
                NonKarnatakaFilled = nkRows.Count(r => r.AllocationStatus == AllocationStatus.Selected),
            };

            categoryBreakdown = BuildCategoryBreakdownWithAllocation(allRows, ProgrammeIntake);

            categoryCutoffs = BuildCategoryCutoffs(kaRows, "KA")
                .Concat(BuildCategoryCutoffs(hkRows, "HK"))
                .Concat(BuildCategoryCutoffs(nkRows, "NK"))
                .Where(c => c.FilledSeats > 0)
                .ToList();

            omnibus = kaRows.Concat(hkRows).Concat(nkRows)
                .OrderByDescending(r => r.MeritScore).ThenBy(r => r.Name)
                .ToList();
            for (int i = 0; i < omnibus.Count; i++) omnibus[i].Rank = i + 1;
        }

        var reportData = new MeritListReportData
        {
            Rows = omnibus,
            HyderabadKarnatakaRows = new List<MeritListReportRow>(),
            NonKarnatakaRows = new List<MeritListReportRow>(),
            SeatMatrixBreakdown = seatMatrixBreakdown,
            SupernumeraryAllotments = supernumeraryAllotments,
            CertificateCutoffs = certificateCutoffs,
            LogoBytes = logoBytes,
            DegreeName = degreeName,
            CourseName = courseName,
            CategoryFilter = category,
            SeatTypeFilter = seatType,
            KarnatakaFilter = karnataka,
            AcademicYear = displayAcademicYear,
            ReportTitle = "Provisional  Merit List",
            ListType = listType,
            ProgrammeIntake = ProgrammeIntake,
            CategoryBreakdown = categoryBreakdown,
            AllocationSummary = allocationSummary,
            CategoryCutoffs = categoryCutoffs,
            DegreeType = degreeTypeName,
            IsCertificateCourse = isCertificationCourse,
            IsPgCourse = isPgProgramme,
            PgCategoryBreakdown = pgCategoryBreakdown,
            PgKkAllotments = pgKkAllotments,
            PgPwdAllotment = pgPwdAllotment,
            PgCutoffs = pgCutoffs,
        };

        var pdfBytes = new MeritListReport(reportData).GeneratePdf();

        var safeAcademicYear = !string.IsNullOrWhiteSpace(academicYearName)
            ? academicYearName.Replace(" ", "").Replace("–", "-")
            : "AY";
        var safeDegree = !string.IsNullOrWhiteSpace(degreeName)
            ? degreeName.Replace(" ", "").Replace("/", "-")
            : "General";
        string fileName = $"MeritList_{safeAcademicYear}_{safeDegree}.pdf";

        return (pdfBytes, fileName);
    }
    private static void ApplyCategoryWiseAllocation(List<MeritListReportRow> rows, int totalSeats, bool backfillVacantSeats = false)
    {
        var reservations = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase)
            {
                { "SC",    0.17 }, { "ST",   0.07 },
                { "Cat-I", 0.04 }, { "Category I",   0.04 },
                { "IIA",   0.15 }, { "Category IIA", 0.15 }, { "2A", 0.15 },
                { "IIB",   0.04 }, { "Category IIB", 0.04 }, { "2B", 0.04 },
                { "IIIA",  0.04 }, { "Category IIIA",0.04 }, { "3A", 0.04 },
                { "IIIB",  0.05 }, { "Category IIIB",0.05 }, { "3B", 0.05 },
                { "GM",    0.44 },
            };

        var categoryOrder = new[] { "SC", "ST", "Cat-I", "IIA", "IIB", "IIIA", "IIIB", "GM" };

        var seatsPerCategory = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        int allocatedTotal = 0;
        foreach (var cat in categoryOrder)
        {
            double pct = reservations.TryGetValue(cat, out var p) ? p : 0;
            int seats = (int)Math.Floor(totalSeats * pct);
            seatsPerCategory[cat] = seats;
            allocatedTotal += seats;
        }

        int remainder = totalSeats - allocatedTotal;
        if (remainder > 0) seatsPerCategory["GM"] = seatsPerCategory.GetValueOrDefault("GM") + remainder;

        int carryForwardPool = 0;
        int filledTotal = 0;

        foreach (var cat in categoryOrder)
        {
            int reservedSeats = seatsPerCategory.GetValueOrDefault(cat, 0) + carryForwardPool;
            carryForwardPool = 0;

            var catCandidates = rows
                .Where(r => NormalizeCategory(r.Category) == NormalizeCategory(cat))
                .OrderByDescending(r => r.MeritScore)
                .ThenBy(r => r.Name)
                .ToList();

            int filled = 0;
            foreach (var candidate in catCandidates)
            {
                if (filled < reservedSeats)
                {
                    candidate.AllocationStatus = AllocationStatus.Selected;
                    candidate.AllocatedCategory = cat;
                    candidate.Remark = null;
                    filled++;
                }
                else
                {
                    candidate.AllocationStatus = AllocationStatus.Waitlisted;
                    candidate.Remark = $"{cat} category seats full — Waitlisted";
                }
            }
            filledTotal += filled;
            int vacant = reservedSeats - filled;
            if (vacant > 0) carryForwardPool += vacant;
        }

        foreach (var r in rows.Where(r => r.AllocationStatus == AllocationStatus.Waitlisted &&
                                        !categoryOrder.Any(c =>
                                            NormalizeCategory(r.Category) == NormalizeCategory(c))))
        {
            r.AllocationStatus = AllocationStatus.NotSelected;
            r.Remark = "Category not recognized under reservation policy";
        }


    }

    private static (List<CategorySeatMatrixRow> matrix, List<SupernumeraryAllotmentRow> supernumerary)
AllocateCertificateCourseSeats(List<MeritListReportRow> allRows)
    {
        foreach (var r in allRows)
        {
            r.AllocationStatus = AllocationStatus.Waitlisted;
            r.AllocatedCategory = null;
            r.Remark = null;
        }

        var allotted = new HashSet<MeritListReportRow>();
        var supernumeraryResults = new List<SupernumeraryAllotmentRow>();

        // Step 1 — Supernumerary quotas (unchanged)
        foreach (var (quotaName, seatCount) in SupernumeraryQuotaSeats)
        {
            var eligible = allRows
                .Where(r => !allotted.Contains(r) &&
                            r.SupernumeraryQuotas.Any(q => q.Equals(quotaName, StringComparison.OrdinalIgnoreCase)))
                .OrderByDescending(r => r.MeritScore)
                .ThenBy(r => r.Name)
                .ToList();

            int filled = 0;
            var allottedThisQuota = new List<MeritListReportRow>();
            foreach (var candidate in eligible)
            {
                if (filled >= seatCount) break;
                candidate.AllocationStatus = AllocationStatus.Selected;
                candidate.AllocatedCategory = $"Supernumerary - {quotaName}";
                candidate.Remark = $"Allotted under Supernumerary Quota — {quotaName}";
                allotted.Add(candidate);
                allottedThisQuota.Add(candidate);
                filled++;
            }

            supernumeraryResults.Add(new SupernumeraryAllotmentRow
            {
                QuotaName = quotaName,
                ReservedSeats = seatCount,
                FilledSeats = filled,
                AllottedStudents = allottedThisQuota
            });
        }

        var matrixResults = new List<CategorySeatMatrixRow>();

        // Step 2 — GM (open merit) FIRST, drawn from the ENTIRE remaining pool.
        // General (G) seats are filled FIRST by pure merit; only candidates who
        // don't make it into G are then considered for RC/KM/KK/PWD sub-quotas.
        if (CertificateCourseSeatMatrix.TryGetValue("GM", out var gmSeats))
        {
            var gmPool = allRows
                .Where(r => !allotted.Contains(r))
                .OrderByDescending(r => r.MeritScore)
                .ThenBy(r => r.Name)
                .ToList();

            // --- General seats FIRST ---
            int gmGFilled = 0;
            foreach (var candidate in gmPool)
            {
                if (gmGFilled >= gmSeats.G) break;
                candidate.AllocationStatus = AllocationStatus.Selected;
                candidate.AllocatedCategory = "GM - General";
                candidate.Remark = "Selected under GM - General";
                allotted.Add(candidate);
                gmGFilled++;
            }

            // --- Sub-quotas from whoever's left in the GM pool ---
            int gmRcFilled = FillSubQuota(gmPool, allotted, r => r.IsRural, gmSeats.RC, "GM", "Rural (RC)");
            int gmKmFilled = FillSubQuota(gmPool, allotted, r => r.IsKannadaMedium, gmSeats.KM, "GM", "Kannada Medium (KM)");
            int gmKkFilled = FillSubQuota(gmPool, allotted, r => r.IsKalyanaKarnataka, gmSeats.KK, "GM", "Kalyana Karnataka (KK)");
            int gmPwdFilled = FillSubQuota(gmPool, allotted, r => r.IsPwd, gmSeats.PWD, "GM", "PWD");

            matrixResults.Add(new CategorySeatMatrixRow
            {
                Category = "GM",
                GeneralReserved = gmSeats.G,
                GeneralFilled = gmGFilled,
                RuralReserved = gmSeats.RC,
                RuralFilled = gmRcFilled,
                KannadaMediumReserved = gmSeats.KM,
                KannadaMediumFilled = gmKmFilled,
                KalyanaKarnatakaReserved = gmSeats.KK,
                KalyanaKarnatakaFilled = gmKkFilled,
                PwdReserved = gmSeats.PWD,
                PwdFilled = gmPwdFilled,
            });
        }

        // Step 3 — Reserved categories, each filtered to that category's OWN
        // applicants not already allotted a GM seat in Step 2.
        var reservedCategoryOrder = new[] { "SC", "ST", "Cat-I", "IIA", "IIB", "IIIA", "IIIB" };

        foreach (var cat in reservedCategoryOrder)
        {
            if (!CertificateCourseSeatMatrix.TryGetValue(cat, out var seats)) continue;

            var categoryRows = allRows
                .Where(r => !allotted.Contains(r) && NormalizeCategory(r.Category) == NormalizeCategory(cat))
                .OrderByDescending(r => r.MeritScore)
                .ThenBy(r => r.Name)
                .ToList();

            // --- General seats FIRST ---
            int gFilled = 0;
            foreach (var candidate in categoryRows)
            {
                if (gFilled >= seats.G) break;
                candidate.AllocationStatus = AllocationStatus.Selected;
                candidate.AllocatedCategory = $"{cat} - General";
                candidate.Remark = $"Selected under {cat} - General";
                allotted.Add(candidate);
                gFilled++;
            }

            // --- Sub-quotas from whoever's left in this category's pool ---
            int rcFilled = FillSubQuota(categoryRows, allotted, r => r.IsRural, seats.RC, cat, "Rural (RC)");
            int kmFilled = FillSubQuota(categoryRows, allotted, r => r.IsKannadaMedium, seats.KM, cat, "Kannada Medium (KM)");
            int kkFilled = FillSubQuota(categoryRows, allotted, r => r.IsKalyanaKarnataka, seats.KK, cat, "Kalyana Karnataka (KK)");
            int pwdFilled = FillSubQuota(categoryRows, allotted, r => r.IsPwd, seats.PWD, cat, "PWD");

            // Whoever's left after G + all four sub-quotas is genuinely waitlisted
            foreach (var candidate in categoryRows.Where(r => !allotted.Contains(r)))
            {
                candidate.AllocationStatus = AllocationStatus.Waitlisted;
                candidate.Remark = $"{cat} category seats full — Waitlisted";
            }

            matrixResults.Add(new CategorySeatMatrixRow
            {
                Category = cat,
                GeneralReserved = seats.G,
                GeneralFilled = gFilled,
                RuralReserved = seats.RC,
                RuralFilled = rcFilled,
                KannadaMediumReserved = seats.KM,
                KannadaMediumFilled = kmFilled,
                KalyanaKarnatakaReserved = seats.KK,
                KalyanaKarnatakaFilled = kkFilled,
                PwdReserved = seats.PWD,
                PwdFilled = pwdFilled,
            });
        }
        foreach (var r in allRows.Where(r => !allotted.Contains(r) && string.IsNullOrWhiteSpace(r.Remark)))
        {
            r.AllocationStatus = AllocationStatus.Waitlisted;
            r.Remark = $"{r.Category} category seats full — Waitlisted";
        }
        return (matrixResults, supernumeraryResults);
    }
    private static (List<PgProgrammeCategoryRow> categories, List<PgKkAllotmentRow> kk, PgPwdAllotmentRow pwd)
        AllocatePgCourseSeats(List<MeritListReportRow> allRows, PgSeatMatrixDefinition matrix)
    {
        foreach (var r in allRows)
        {
            r.AllocationStatus = AllocationStatus.Waitlisted;
            r.AllocatedCategory = null;
            r.Remark = null;
        }

        var allotted = new HashSet<MeritListReportRow>();
        var categoryResults = new List<PgProgrammeCategoryRow>();

        // Step 1 — GM (open merit) FIRST, from the ENTIRE pool by pure merit.
        // GM seats are open to every category — not restricted to students
        // whose recorded category happens to be GM.
        PgProgrammeCategoryRow? gmRow = null;
        if (matrix.Categories.TryGetValue("GM", out var gmSeats))
        {
            var gmPool = allRows
                .Where(r => !allotted.Contains(r))
                .OrderByDescending(r => r.MeritScore)
                .ThenBy(r => r.Name)
                .ToList();

            int gmGFilled = 0;
            foreach (var candidate in gmPool)
            {
                if (gmGFilled >= gmSeats.G) break;
                candidate.AllocationStatus = AllocationStatus.Selected;
                candidate.AllocatedCategory = "GM - General";
                candidate.Remark = "Selected under GM - General";
                allotted.Add(candidate);
                gmGFilled++;
            }

            gmRow = new PgProgrammeCategoryRow
            {
                Category = "GM",
                GeneralReserved = gmSeats.G,
                GeneralFilled = gmGFilled,
                RuralReserved = gmSeats.RC,
                KannadaMediumReserved = gmSeats.KM,
                // RuralFilled / KannadaMediumFilled set after Step 4 below
            };
        }

        // Step 2 — KK groups (pooled), checked right after GM's General is filled
        var kkGroups = new List<PgKkAllotmentRow>();

        void FillKkGroup(string groupName, int seatCount, Func<MeritListReportRow, bool> categoryFilter)
        {
            var eligible = allRows
                .Where(r => !allotted.Contains(r) && r.IsKalyanaKarnataka && categoryFilter(r))
                .OrderByDescending(r => r.MeritScore).ThenBy(r => r.Name)
                .ToList();

            var groupAllotted = new List<MeritListReportRow>();
            int filled = 0;
            foreach (var candidate in eligible)
            {
                if (filled >= seatCount) break;
                candidate.AllocationStatus = AllocationStatus.Selected;
                candidate.AllocatedCategory = $"KK - {groupName}";
                candidate.Remark = $"Selected under Kalyana Karnataka - {groupName}";
                allotted.Add(candidate);
                groupAllotted.Add(candidate);
                filled++;
            }
            kkGroups.Add(new PgKkAllotmentRow
            {
                GroupName = groupName,
                ReservedSeats = seatCount,
                FilledSeats = filled,
                AllottedStudents = groupAllotted,
            });
        }

        FillKkGroup("General", matrix.KkGeneral, r => true);
        FillKkGroup("SC/ST", matrix.KkScSt, r =>
            NormalizeCategory(r.Category) == NormalizeCategory("SC") ||
            NormalizeCategory(r.Category) == NormalizeCategory("ST"));
        FillKkGroup("Cat-I/IIA", matrix.KkCatIIia, r =>
            NormalizeCategory(r.Category) == NormalizeCategory("Cat-I") ||
            NormalizeCategory(r.Category) == NormalizeCategory("IIA"));
        FillKkGroup("IIB/IIIA/IIIB", matrix.KkIibIiiaIiib, r =>
            NormalizeCategory(r.Category) == NormalizeCategory("IIB") ||
            NormalizeCategory(r.Category) == NormalizeCategory("IIIA") ||
            NormalizeCategory(r.Category) == NormalizeCategory("IIIB"));

        // Step 3 — PWD (pooled), checked right after KK
        var pwdEligible = allRows
            .Where(r => !allotted.Contains(r) && r.IsPwd)
            .OrderByDescending(r => r.MeritScore).ThenBy(r => r.Name)
            .ToList();

        var pwdAllotted = new List<MeritListReportRow>();
        int pwdFilled = 0;
        foreach (var candidate in pwdEligible)
        {
            if (pwdFilled >= matrix.PwdTotal) break;
            candidate.AllocationStatus = AllocationStatus.Selected;
            candidate.AllocatedCategory = "PWD";
            candidate.Remark = "Selected under PWD quota";
            allotted.Add(candidate);
            pwdAllotted.Add(candidate);
            pwdFilled++;
        }
        var pwdRow = new PgPwdAllotmentRow
        {
            ReservedSeats = matrix.PwdTotal,
            FilledSeats = pwdFilled,
            AllottedStudents = pwdAllotted,
        };

        // Step 4 — GM's own RC / KM sub-quotas, from whoever's left in the
        // open pool (GM is still open to any category here).
        if (gmRow != null && matrix.Categories.TryGetValue("GM", out var gmSeatsAgain))
        {
            var gmRemainingPool = allRows.Where(r => !allotted.Contains(r)).ToList();
            gmRow.RuralFilled = FillSubQuota(gmRemainingPool, allotted, r => r.IsRural, gmSeatsAgain.RC, "GM", "Rural (RC)");
            gmRow.KannadaMediumFilled = FillSubQuota(gmRemainingPool, allotted, r => r.IsKannadaMedium, gmSeatsAgain.KM, "GM", "Kannada Medium (KM)");
            categoryResults.Add(gmRow);
        }

        // Step 5 — Reserved categories, each filtered to that category's OWN
        // applicants not already allotted a GM/KK/PWD seat above.
        var reservedCategoryOrder = new[] { "SC", "ST", "Cat-I", "IIA", "IIB", "IIIA", "IIIB" };

        foreach (var cat in reservedCategoryOrder)
        {
            if (!matrix.Categories.TryGetValue(cat, out var seats)) continue;

            var categoryRows = allRows
                .Where(r => !allotted.Contains(r) && NormalizeCategory(r.Category) == NormalizeCategory(cat))
                .OrderByDescending(r => r.MeritScore).ThenBy(r => r.Name)
                .ToList();

            int gFilled = 0;
            foreach (var candidate in categoryRows)
            {
                if (gFilled >= seats.G) break;
                candidate.AllocationStatus = AllocationStatus.Selected;
                candidate.AllocatedCategory = $"{cat} - General";
                candidate.Remark = $"Selected under {cat} - General";
                allotted.Add(candidate);
                gFilled++;
            }

            int rcFilled = FillSubQuota(categoryRows, allotted, r => r.IsRural, seats.RC, cat, "Rural (RC)");
            int kmFilled = FillSubQuota(categoryRows, allotted, r => r.IsKannadaMedium, seats.KM, cat, "Kannada Medium (KM)");

            foreach (var candidate in categoryRows.Where(r => !allotted.Contains(r)))
            {
                candidate.AllocationStatus = AllocationStatus.Waitlisted;
                candidate.Remark = $"{cat} category seats full — Waitlisted";
            }

            categoryResults.Add(new PgProgrammeCategoryRow
            {
                Category = cat,
                GeneralReserved = seats.G,
                GeneralFilled = gFilled,
                RuralReserved = seats.RC,
                RuralFilled = rcFilled,
                KannadaMediumReserved = seats.KM,
                KannadaMediumFilled = kmFilled,
            });
        }
        foreach (var r in allRows.Where(r => !allotted.Contains(r) && string.IsNullOrWhiteSpace(r.Remark)))
        {
            r.AllocationStatus = AllocationStatus.Waitlisted;
            r.Remark = $"{r.Category} category seats full — Waitlisted";
        }
        return (categoryResults, kkGroups, pwdRow);
    }
    private static List<PgCutoffRow> BuildPgCutoffs(List<MeritListReportRow> allRows)
    {
        var categoryOrder = new[] { "GM", "SC", "ST", "Cat-I", "IIA", "IIB", "IIIA", "IIIB" };
        var selected = allRows.Where(r => r.AllocationStatus == AllocationStatus.Selected).ToList();
        var result = new List<PgCutoffRow>();

        foreach (var cat in categoryOrder)
        {
            var bucket = selected
                .Where(r => NormalizeCategory(r.Category) == NormalizeCategory(cat))
                .OrderByDescending(r => r.MeritScore)
                .ToList();

            if (!bucket.Any()) continue;

            result.Add(new PgCutoffRow
            {
                Category = cat,
                FilledSeats = bucket.Count,
                HighestScore = bucket.First().MeritScore,
                CutoffScore = bucket.Last().MeritScore,
            });
        }

        return result;
    }
    private static List<CertificateCutoffRow> BuildCertificateCutoffs(List<MeritListReportRow> allRows)
    {
        var categoryOrder = new[] { "GM", "SC", "ST", "Cat-I", "IIA", "IIB", "IIIA", "IIIB" };
        var subQuotaOrder = new[] { "General", "Rural (RC)", "Kannada Medium (KM)", "Kalyana Karnataka (KK)", "PWD" };

        var selected = allRows
            .Where(r => r.AllocationStatus == AllocationStatus.Selected &&
                        !string.IsNullOrWhiteSpace(r.AllocatedCategory) &&
                        !r.AllocatedCategory!.StartsWith("Supernumerary", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var result = new List<CertificateCutoffRow>();

        foreach (var cat in categoryOrder)
        {
            foreach (var subQuota in subQuotaOrder)
            {
                var bucketKey = $"{cat} - {subQuota}";
                var bucket = selected
                    .Where(r => string.Equals(r.AllocatedCategory, bucketKey, StringComparison.OrdinalIgnoreCase))
                    .OrderByDescending(r => r.MeritScore)
                    .ToList();

                if (!bucket.Any()) continue;

                result.Add(new CertificateCutoffRow
                {
                    Category = cat,
                    SubQuota = subQuota,
                    FilledSeats = bucket.Count,
                    HighestScore = bucket.First().MeritScore,
                    CutoffScore = bucket.Last().MeritScore,
                });
            }
        }

        return result;
    }
    private static int FillSubQuota(
        List<MeritListReportRow> categoryRows, HashSet<MeritListReportRow> allotted,
        Func<MeritListReportRow, bool> flagSelector, int seatCount, string cat, string label)
    {
        var eligible = categoryRows.Where(r => !allotted.Contains(r) && flagSelector(r)).ToList();
        int filled = 0;
        foreach (var candidate in eligible)
        {
            if (filled >= seatCount) break;
            candidate.AllocationStatus = AllocationStatus.Selected;
            candidate.AllocatedCategory = $"{cat} - {label}";
            candidate.Remark = $"Selected under {cat} - {label} quota";
            allotted.Add(candidate);
            filled++;
        }
        return filled;
    }
    private static List<CategoryBreakdownRow> BuildCategoryBreakdownWithAllocation(
    List<MeritListReportRow> rows, int intake)
    {
        var reservations = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                { "SC",17 },{ "ST",7 },{ "Cat-I",4 },{ "Category I",4 },
                { "IIA",15 },{ "Category IIA",15 },{ "2A",15 },
                { "IIB",4 },{ "Category IIB",4 },{ "2B",4 },
                { "IIIA",4 },{ "Category IIIA",4 },{ "3A",4 },
                { "IIIB",5 },{ "Category IIIB",5 },{ "3B",5 },
                { "GM",44 },
            };

        var displayOrder = new[] { "SC", "ST", "Cat-I", "IIA", "IIB", "IIIA", "IIIB", "GM" };
        var result = new List<CategoryBreakdownRow>();

        foreach (var cat in displayOrder)
        {
            int pct = reservations.TryGetValue(cat, out var p) ? p : 0;
            int seats = (int)Math.Floor(intake * pct / 100.0);
            var catRows = rows.Where(r => NormalizeCategory(r.Category) == NormalizeCategory(cat)).ToList();
            var selected = catRows.Where(r => r.AllocationStatus == AllocationStatus.Selected).ToList();
            var waitlisted = catRows.Where(r => r.AllocationStatus == AllocationStatus.Waitlisted).ToList();
            float cutoff = selected.Any() ? selected.Min(r => r.MeritScore) : 0f;

            result.Add(new CategoryBreakdownRow
            {
                Category = cat,
                ReservationPct = pct,
                ReservedSeats = seats,
                AppliedCount = catRows.Count,
                SelectedCount = selected.Count,
                WaitlistCount = waitlisted.Count,
                CutoffScore = cutoff,
            });
        }

        return result;
    }

    private static List<CategoryCutoffRow> BuildCategoryCutoffs(
        List<MeritListReportRow> rows, string studentTypeLabel)
    {
        var displayOrder = new[] { "SC", "ST", "Cat-I", "IIA", "IIB", "IIIA", "IIIB", "GM" };
        var result = new List<CategoryCutoffRow>();

        foreach (var cat in displayOrder)
        {
            var selected = rows
                .Where(r => NormalizeCategory(r.Category) == NormalizeCategory(cat) &&
                            r.AllocationStatus == AllocationStatus.Selected)
                .OrderByDescending(r => r.MeritScore)
                .ToList();

            if (!selected.Any()) continue;

            result.Add(new CategoryCutoffRow
            {
                Category = cat,
                ReservedSeats = selected.Count,
                FilledSeats = selected.Count,
                HighestScore = selected.First().MeritScore,
                CutoffScore = selected.Last().MeritScore,
                LowestScore = rows.Where(r => NormalizeCategory(r.Category) == NormalizeCategory(cat))
                                .Min(r => r.MeritScore),
                StudentType = studentTypeLabel,
            });
        }

        return result;
    }


    private async Task<object> BuildAllMeritListsAsync(
       string? degreeTypeId, string? degreeId, string? courseId, string? academicYearId,
       string? category, string? seatType, string? karnataka, string? listType)
    {
        var allRows = await BuildMeritRowsAsync(
            degreeTypeId, degreeId, courseId, academicYearId, category, seatType, karnataka);

        var karnatakaList = allRows.Where(r => r.StudentType == StudentType.Karnataka).ToList();
        var hkList = allRows.Where(r => r.StudentType == StudentType.HyderabadKarnataka).ToList();
        var nkList = allRows.Where(r => r.StudentType == StudentType.NonKarnataka).ToList();

        for (int i = 0; i < karnatakaList.Count; i++) karnatakaList[i].Rank = i + 1;
        for (int i = 0; i < hkList.Count; i++) hkList[i].Rank = i + 1;
        for (int i = 0; i < nkList.Count; i++) nkList[i].Rank = i + 1;

        Func<MeritListReportRow, object> project = r => new
        {
            rank = r.Rank,
            appNo = r.AppNo,
            name = r.Name,
            fatherName = r.FatherName,
            category = r.Category,
            seatTypes = r.SeatTypes,
            studentType = r.StudentType.ToString(),
            gender = r.Gender,
            phone = r.Phone,
            percentage = r.Percentage,
            meritScore = r.MeritScore,
            status = r.Status
        };

        if (listType?.ToLower() == "karnataka")
            return karnatakaList.Select(project);
        if (listType?.ToLower() == "hyderabad-karnataka")
            return hkList.Select(project);
        if (listType?.ToLower() == "non-karnataka")
            return nkList.Select(project);

        return new
        {
            karnataka = karnatakaList.Select(project),
            hyderabadKarnataka = hkList.Select(project),
            nonKarnataka = nkList.Select(project),
            omnibus = allRows.Select(project)
        };
    }

    private static IEnumerable<string> ExpandStatus(string status)
    {
        foreach (var part in status.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            yield return NormalizeStatus(part);
    }

    private static string NormalizeStatus(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return "";
        return s.ToLower()
                .Replace(" ", "")
                .Replace("-", "")
                .Replace("_", "");
    }

    private static bool IsSuccess(string? s) => s?.ToLower() is "success" or "sucess" or "paid";

    private async Task<HashSet<string>> GetPaidAppNosAsync()
    {
        var allCollections = await _feeCollectionService.GetAllAsync();

        return allCollections
            .Where(fc =>
                IsSuccess(fc.Status) &&
                fc.FeeType?.Contains("Application", StringComparison.OrdinalIgnoreCase) == true)
            .Select(fc => fc.ApplicationNo)
            .Where(a => !string.IsNullOrWhiteSpace(a))
            .ToHashSet(StringComparer.OrdinalIgnoreCase)!;
    }

    private async Task<Dictionary<string, ApplicationVerificationResponseDto>> GetVerificationMapAsync()
    {
        var all = await _verificationService.GetAllAsync();
        return all
            .Where(v => !string.IsNullOrWhiteSpace(v.AppNo))
            .GroupBy(v => v.AppNo!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
    }

    private async Task<Dictionary<string, RegistrationResponseDto>> GetRegistrationMapAsync()
    {
        var all = await _registrationService.GetAllAsync();
        return all
            .Where(r => !string.IsNullOrWhiteSpace(r.Username))
            .GroupBy(r => r.Username!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
    }
    private async Task<HashSet<Guid>> GetFeePaidApplicationIdsAsync()
    {
        var allCollections = await _feeCollectionService.GetAllAsync();

        return allCollections
            .Where(fc =>
                IsSuccess(fc.Status) &&
                (fc.FeeType ?? "").ToLower().Contains("application fee"))
            .Select(fc => fc.ApplicationId)
            .ToHashSet();
    }
    private async Task<List<MeritListReportRow>> BuildMeritRowsAsync(
    string? degreeTypeId,
    string? degreeId,
    string? courseId,
    string? academicYearId,
    string? category,
    string? seatType,
    string? karnataka,
    bool isCertificationCourse = false)
    {
        bool hasDegreeType = Guid.TryParse(degreeTypeId, out var degreeTypeGuid);

        var filter = new ApplicationFilterDto
        {
            DegreeId = Guid.TryParse(degreeId, out var dg) ? dg : (Guid?)null,
            CourseId = Guid.TryParse(courseId, out var cg) ? cg : (Guid?)null,
            AcademicYearId = null,
        };
        bool hasDegreeFilter = Guid.TryParse(degreeId, out var targetDegreeGuid);
        bool hasCourseFilter = Guid.TryParse(courseId, out var targetCourseGuid);
        var allApps = await _queryService.FilterAsync(filter);
        var lookupMap = (await _lookupService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.Name ?? x.Code ?? x.Id.ToString());


        var degreeMap = (await _degreeService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.DegreeName ?? x.Id.ToString());
        var courseMap = (await _courseService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.Name ?? x.Id.ToString());

        var paidAppNos = await GetPaidAppNosAsync();
        var verificationMap = await GetVerificationMapAsync();
        var registrationMap = await GetRegistrationMapAsync();
        var allPgEducationDetails = await _pgEducationService.GetAllAsync();
        var pgEducationMap = allPgEducationDetails
            .Where(d => d.ApplicationId != Guid.Empty)
            .GroupBy(d => d.ApplicationId)
            .ToDictionary(g => g.Key, g => g.ToList());
        var categoryFilter = SplitFilter(category);
        var seatTypeFilter = SplitFilter(seatType);


        var allAcademicYears = await _academicYearService.GetAllAsync();
        Guid? defaultBatchId = allAcademicYears
            .FirstOrDefault(a => a.Description != null &&
                                 a.Description.Contains("2026-2027", StringComparison.OrdinalIgnoreCase) ||
                                 (a.Description != null && a.Description.Contains("2026", StringComparison.OrdinalIgnoreCase) &&
                                  a.Description.Contains("2027", StringComparison.OrdinalIgnoreCase)))
            ?.Id;

        bool hasAY = Guid.TryParse(academicYearId, out var ayGuid);

        var unsorted = new List<MeritListReportRow>();

        foreach (var appData in allApps)
        {
            var app = appData.Application;
            if (app == null) continue;

            if (string.IsNullOrWhiteSpace(app.AppNo) || !paidAppNos.Contains(app.AppNo))
                continue;


            Guid? appBatchId = null;
            try { appBatchId = appData.CourseDetails?.FirstOrDefault()?.BatchId; } catch { }

            string preferenceDisplay = "No Pref";
            if (hasDegreeFilter)
            {
                var matchedCourseDetail = appData.CourseDetails?.FirstOrDefault(cd =>
                    cd.DegreeId == targetDegreeGuid &&
                    (!hasCourseFilter || cd.CourseId == targetCourseGuid));

                if (matchedCourseDetail == null) continue;

                int prefRank = ParsePreferenceRank(matchedCourseDetail.Preference);
                preferenceDisplay = prefRank > 0 ? $"P{prefRank}" : (matchedCourseDetail.Preference ?? "No Pref");
            }

            Guid? effectiveBatchId = appBatchId ?? defaultBatchId;

            if (hasAY && effectiveBatchId != ayGuid)
                continue;

            var seatNames = new List<string>();
            if (appData.SeatTypes?.Any() == true)
            {
                seatNames = appData.SeatTypes
                    .Select(s =>
                    {
                        if (!string.IsNullOrWhiteSpace(s.SeatTypeName)) return s.SeatTypeName;
                        if (s.SeatTypeId.HasValue &&
                            lookupMap.TryGetValue(s.SeatTypeId.Value, out var stName))
                            return stName;
                        return null;
                    })
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct()
                    .ToList()!;
            }

            var studentType = DetermineStudentType(app, seatNames);

            if (!PassesKarnatakaFilter(karnataka, studentType)) continue;
            bool isInService = seatNames.Any(s => s.Contains("In-Service", StringComparison.OrdinalIgnoreCase));
            if (isInService) continue;

            string categoryName = app.CategoryId.HasValue &&
                lookupMap.TryGetValue(app.CategoryId.Value, out var catName)
                    ? catName : "GM";

            string genderName = app.Gender.HasValue &&
                lookupMap.TryGetValue(app.Gender.Value, out var genName)
                    ? genName : "—";

            if (categoryFilter.Count > 0 &&
                !categoryFilter.Any(c => NormalizeCategory(c) == NormalizeCategory(categoryName)))
                continue;

            if (seatTypeFilter.Count > 0 &&
                !seatNames.Any(n => seatTypeFilter.Any(f =>
                    n.Contains(f, StringComparison.OrdinalIgnoreCase))))
                continue;

            verificationMap.TryGetValue(app.AppNo ?? "", out var verification);
            string currentVerificationStatus = verification?.VerificationStatus ?? "";

            if (!string.Equals(currentVerificationStatus, "Accepted", StringComparison.OrdinalIgnoreCase))
                continue;

            registrationMap.TryGetValue(app.InsertBy ?? "", out var registration);

            if (hasDegreeType && registration?.DegreeTypeId != degreeTypeGuid)
                continue;

            string? degreeTypeName = registration?.DegreeTypeId.HasValue == true &&
                lookupMap.TryGetValue(registration.DegreeTypeId.Value, out var dtName)
                    ? dtName : null;

            bool isPgApplication = !string.IsNullOrWhiteSpace(degreeTypeName) &&
                degreeTypeName.Contains("PG", StringComparison.OrdinalIgnoreCase);

            float percentage;
            string qualificationLabel = "—";
            List<DegreePreferenceRow> degreePreferences = new();

            if (isPgApplication)
            {
                pgEducationMap.TryGetValue(app.Id, out var pgDetailsList);
                var pgDetails = pgDetailsList ?? new List<PgEducationDetailDto>();
                percentage = ResolvePgOverallPercentage(pgDetails);

                if (appData.CourseDetails != null)
                {
                    degreePreferences = appData.CourseDetails
                        .OrderBy(cd => ParsePreferenceRank(cd.Preference))
                        .Select(cd => new DegreePreferenceRow
                        {
                            Order = ParsePreferenceRank(cd.Preference),
                            DegreeName = cd.DegreeId.HasValue && degreeMap.TryGetValue(cd.DegreeId.Value, out var dn2)
                                ? dn2 : "—",
                            CourseName = cd.CourseId.HasValue && courseMap.TryGetValue(cd.CourseId.Value, out var cn2)
                                ? cn2 : "—",
                            Status = "—"
                        })
                        .ToList();
                }
            }
            else
            {
                if (appData.EducationDetails?.Any() == true)
                {
                    var summary = ResolveTwelfthOrDiplomaSummary(appData.EducationDetails);
                    qualificationLabel = summary.Label;
                    percentage = isCertificationCourse
                        ? summary.Percentage
                        : ResolveQualifyingPercentage(appData.EducationDetails);
                }
                else
                {
                    percentage = -1f;
                    qualificationLabel = "—";
                }
            }

            if (percentage < 0f) continue;

            float meritScore = percentage;

            var supernumeraryQuotas = new List<string>();
            foreach (var quotaName in SupernumeraryQuotaSeats.Keys)
            {
                if (seatNames.Any(s => s.Contains(quotaName, StringComparison.OrdinalIgnoreCase)))
                    supernumeraryQuotas.Add(quotaName);
            }

            unsorted.Add(new MeritListReportRow
            {
                AppNo = app.AppNo ?? "—",
                Name = app.Name ?? "—",
                Preference = preferenceDisplay,
                FatherName = app.FatherName ?? "",
                Category = categoryName,
                SeatTypes = seatNames,
                Qualification = qualificationLabel,
                StudentType = studentType,
                Gender = genderName,
                Phone = app.Phone,
                Percentage = percentage,
                MeritScore = meritScore,
                Status = verification?.VerificationStatus ?? "Pending",
                DegreePreferences = degreePreferences,
                IsRural = seatNames.Any(s => s.Contains("Rural", StringComparison.OrdinalIgnoreCase)),
                IsKannadaMedium = seatNames.Any(s => s.Contains("Kannada Medium", StringComparison.OrdinalIgnoreCase)),
                IsKalyanaKarnataka = seatNames.Any(s => s.Contains("Hyderabad Karnataka", StringComparison.OrdinalIgnoreCase)),
                IsPwd = seatNames.Any(s => s.Contains("Differently Able", StringComparison.OrdinalIgnoreCase)),
                SupernumeraryQuotas = supernumeraryQuotas,
            });
        }

        var ranked = unsorted
            .OrderByDescending(r => r.MeritScore)
            .ThenBy(r => r.Name)
            .ToList();

        for (int i = 0; i < ranked.Count; i++)
            ranked[i].Rank = i + 1;

        return ranked;
    }
    private static readonly Dictionary<string, (int G, int RC, int KM, int KK, int PWD)> CertificateCourseSeatMatrix =
        new(StringComparer.OrdinalIgnoreCase)
    {
    { "GM",    (118, 26, 9, 14, 9) },
    { "SC",    (45, 10, 5, 5, 3) },
    { "ST",    (19, 4, 2, 2, 1) },
    { "Cat-I", (11, 2, 1, 1, 1) },
    { "IIA",   (38, 9, 5, 5, 3) },
    { "IIB",   (11, 2, 1, 1, 1) },
    { "IIIA",  (11, 2, 1, 1, 1) },
    { "IIIB",  (12, 3, 2, 2, 1) },
    };

    private class PgSeatMatrixDefinition
    {
        public Dictionary<string, (int G, int RC, int KM)> Categories { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public int KkGeneral { get; set; }
        public int KkScSt { get; set; }
        public int KkCatIIia { get; set; }
        public int KkIibIiiaIiib { get; set; }
        public int PwdTotal { get; set; }
    }


    private static readonly Dictionary<string, PgSeatMatrixDefinition> PgSeatMatrixByProgramme =
    new(StringComparer.OrdinalIgnoreCase)
    {
        ["Rural Management (Agribusiness Management / Rural Development Management / Financial Management / Human Resource Management)"] = new PgSeatMatrixDefinition
        {
            Categories = new(StringComparer.OrdinalIgnoreCase)
            {
                ["GM"] = (17, 4, 1),
                ["SC"] = (7, 1, 1),
                ["ST"] = (2, 1, 1),
                ["Cat-I"] = (1, 1, 0),
                ["IIA"] = (7, 1, 0),
                ["IIB"] = (2, 0, 0),
                ["IIIA"] = (2, 0, 0),
                ["IIIB"] = (2, 1, 0),
            },
            KkGeneral = 2,
            KkScSt = 1,
            KkCatIIia = 1,
            KkIibIiiaIiib = 1,
            PwdTotal = 3,
        },
        ["Rural Development (Panchayat Raj / Co-operative Management)"] = new PgSeatMatrixDefinition
        {
            Categories = new(StringComparer.OrdinalIgnoreCase)
            {
                ["GM"] = (12, 2, 1),
                ["SC"] = (4, 1, 1),
                ["ST"] = (1, 1, 0),
                ["Cat-I"] = (1, 1, 0),
                ["IIA"] = (4, 1, 0),
                ["IIB"] = (1, 1, 0),
                ["IIIA"] = (1, 0, 0),
                ["IIIB"] = (2, 0, 0),
            },
            KkGeneral = 1,
            KkScSt = 1,
            KkCatIIia = 1,
            KkIibIiiaIiib = 0,
            PwdTotal = 2,
        },
        ["Public Administration"] = new PgSeatMatrixDefinition
        {
            Categories = new(StringComparer.OrdinalIgnoreCase)
            {
                ["GM"] = (12, 2, 1),
                ["SC"] = (4, 1, 1),
                ["ST"] = (1, 1, 0),
                ["Cat-I"] = (1, 1, 0),
                ["IIA"] = (4, 1, 0),
                ["IIB"] = (1, 1, 0),
                ["IIIA"] = (1, 0, 0),
                ["IIIB"] = (2, 0, 0),
            },
            KkGeneral = 1,
            KkScSt = 1,
            KkCatIIia = 1,
            KkIibIiiaIiib = 0,
            PwdTotal = 2,
        },
        ["Economics - Development Economics"] = new PgSeatMatrixDefinition
        {
            Categories = new(StringComparer.OrdinalIgnoreCase)
            {
                ["GM"] = (12, 2, 1),
                ["SC"] = (4, 1, 1),
                ["ST"] = (1, 1, 0),
                ["Cat-I"] = (1, 1, 0),
                ["IIA"] = (4, 1, 0),
                ["IIB"] = (1, 1, 0),
                ["IIIA"] = (1, 0, 0),
                ["IIIB"] = (2, 0, 0),
            },
            KkGeneral = 1,
            KkScSt = 1,
            KkCatIIia = 1,
            KkIibIiiaIiib = 0,
            PwdTotal = 2,
        },
        ["Political Science (Panchayat Raj and Rural Development)"] = new PgSeatMatrixDefinition
        {
            Categories = new(StringComparer.OrdinalIgnoreCase)
            {
                ["GM"] = (12, 2, 1),
                ["SC"] = (4, 1, 1),
                ["ST"] = (1, 1, 0),
                ["Cat-I"] = (1, 1, 0),
                ["IIA"] = (4, 1, 0),
                ["IIB"] = (1, 1, 0),
                ["IIIA"] = (1, 0, 0),
                ["IIIB"] = (2, 0, 0),
            },
            KkGeneral = 1,
            KkScSt = 1,
            KkCatIIia = 1,
            KkIibIiiaIiib = 0,
            PwdTotal = 2,
        },
        ["Geoinformatics"] = new PgSeatMatrixDefinition
        {
            Categories = new(StringComparer.OrdinalIgnoreCase)
            {
                ["GM"] = (8, 2, 1),
                ["SC"] = (3, 1, 0),
                ["ST"] = (1, 1, 0),
                ["Cat-I"] = (1, 0, 0),
                ["IIA"] = (3, 1, 0),
                ["IIB"] = (1, 0, 0),
                ["IIIA"] = (1, 0, 0),
                ["IIIB"] = (1, 0, 0),
            },
            KkGeneral = 1,
            KkScSt = 1,
            KkCatIIia = 1,
            KkIibIiiaIiib = 0,
            PwdTotal = 2,
        },
        ["Master of Computer Applications - Artificial Intelligence"] = new PgSeatMatrixDefinition
        {
            Categories = new(StringComparer.OrdinalIgnoreCase)
            {
                ["GM"] = (17, 4, 1),
                ["SC"] = (7, 1, 1),
                ["ST"] = (2, 1, 1),
                ["Cat-I"] = (1, 1, 0),
                ["IIA"] = (7, 1, 0),
                ["IIB"] = (2, 0, 0),
                ["IIIA"] = (2, 0, 0),
                ["IIIB"] = (2, 1, 0),
            },
            KkGeneral = 2,
            KkScSt = 1,
            KkCatIIia = 1,
            KkIibIiiaIiib = 1,
            PwdTotal = 3,
        },
        ["Food Science and Technology"] = new PgSeatMatrixDefinition
        {
            Categories = new(StringComparer.OrdinalIgnoreCase)
            {
                ["GM"] = (12, 2, 1),
                ["SC"] = (4, 1, 1),
                ["ST"] = (1, 1, 0),
                ["Cat-I"] = (1, 1, 0),
                ["IIA"] = (4, 1, 0),
                ["IIB"] = (1, 1, 0),
                ["IIIA"] = (1, 0, 0),
                ["IIIB"] = (2, 0, 0),
            },
            KkGeneral = 1,
            KkScSt = 1,
            KkCatIIia = 1,
            KkIibIiiaIiib = 0,
            PwdTotal = 2,
        },
        ["Community Development / Community Health / Human Resource Management"] = new PgSeatMatrixDefinition
        {
            Categories = new(StringComparer.OrdinalIgnoreCase)
            {
                ["GM"] = (12, 2, 1),
                ["SC"] = (4, 1, 1),
                ["ST"] = (1, 1, 0),
                ["Cat-I"] = (1, 1, 0),
                ["IIA"] = (4, 1, 0),
                ["IIB"] = (1, 1, 0),
                ["IIIA"] = (1, 0, 0),
                ["IIIB"] = (2, 0, 0),
            },
            KkGeneral = 1,
            KkScSt = 1,
            KkCatIIia = 1,
            KkIibIiiaIiib = 0,
            PwdTotal = 2,
        },
        ["Entrepreneurship / Co-operative Management"] = new PgSeatMatrixDefinition
        {
            Categories = new(StringComparer.OrdinalIgnoreCase)
            {
                ["GM"] = (12, 2, 1),
                ["SC"] = (4, 1, 1),
                ["ST"] = (1, 1, 0),
                ["Cat-I"] = (1, 1, 0),
                ["IIA"] = (4, 1, 0),
                ["IIB"] = (1, 1, 0),
                ["IIIA"] = (1, 0, 0),
                ["IIIB"] = (2, 0, 0),
            },
            KkGeneral = 1,
            KkScSt = 1,
            KkCatIIia = 1,
            KkIibIiiaIiib = 0,
            PwdTotal = 2,
        },
        ["Master of Public Health"] = new PgSeatMatrixDefinition
        {
            Categories = new(StringComparer.OrdinalIgnoreCase)
            {
                ["GM"] = (12, 2, 1),
                ["SC"] = (4, 1, 1),
                ["ST"] = (1, 1, 0),
                ["Cat-I"] = (1, 1, 0),
                ["IIA"] = (4, 1, 0),
                ["IIB"] = (1, 1, 0),
                ["IIIA"] = (1, 0, 0),
                ["IIIB"] = (2, 0, 0),
            },
            KkGeneral = 1,
            KkScSt = 1,
            KkCatIIia = 1,
            KkIibIiiaIiib = 0,
            PwdTotal = 2,
        },
    };
    private static readonly Dictionary<string, int> SupernumeraryQuotaSeats =
        new(StringComparer.OrdinalIgnoreCase)
    {
    { "NSS", 1 }, { "NCC", 1 }, { "Sports", 1 }, { "Cultural", 1 },
    { "Defence", 1 }, { "Transgender", 1 }, { "Kashmiri Migrant", 1 },
    { "Jammu and Kashmir", 2 }, { "Foreign National", 2 },
    { "Outside Karnataka", 60 },
    };
    private static StudentType DetermineStudentType(dynamic app, List<string> seatNames)
    {

        if (seatNames.Any(s =>
                s.Contains("Hyderabad", StringComparison.OrdinalIgnoreCase) ||
                s.Contains("HK", StringComparison.OrdinalIgnoreCase)))
            return StudentType.HyderabadKarnataka;

        bool isKarnataka = false;
        try
        {
            object? raw = app.KarnatakaYn;
            if (raw != null) isKarnataka = Convert.ToBoolean(raw);
        }
        catch { isKarnataka = false; }

        return isKarnataka ? StudentType.Karnataka : StudentType.NonKarnataka;
    }
    private async Task<List<PgInServiceCourseGroup>> BuildPgInServiceCourseWiseAsync(
        string? degreeTypeId, string? category)
    {
        bool hasDegreeType = Guid.TryParse(degreeTypeId, out var degreeTypeGuid);

        var allApps = await _queryService.FilterAsync(new ApplicationFilterDto());
        var lookupMap = (await _lookupService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.Name ?? x.Code ?? x.Id.ToString());
        var degreeMap = (await _degreeService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.DegreeName ?? x.Id.ToString());
        var courseMap = (await _courseService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.Name ?? x.Id.ToString());

        var paidAppNos = await GetPaidAppNosAsync();
        var verificationMap = await GetVerificationMapAsync();
        var registrationMap = await GetRegistrationMapAsync();
        var categoryFilter = SplitFilter(category);

        var allPgEducationDetails = await _pgEducationService.GetAllAsync();
        var pgEducationMap = allPgEducationDetails
            .Where(d => d.ApplicationId != Guid.Empty)
            .GroupBy(d => d.ApplicationId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var flatRows = new List<MeritListReportRow>();
        var courseKeyByRow = new Dictionary<MeritListReportRow, (string Degree, string Course)>();

        foreach (var appData in allApps)
        {
            var app = appData.Application;
            if (app == null) continue;
            if (string.IsNullOrWhiteSpace(app.AppNo) || !paidAppNos.Contains(app.AppNo))
                continue;

            registrationMap.TryGetValue(app.InsertBy ?? "", out var registration);
            string? degreeTypeName = registration?.DegreeTypeId.HasValue == true &&
                lookupMap.TryGetValue(registration.DegreeTypeId.Value, out var dtName)
                    ? dtName : null;
            bool isPgApplication = !string.IsNullOrWhiteSpace(degreeTypeName) &&
                degreeTypeName.Contains("PG", StringComparison.OrdinalIgnoreCase);
            if (!isPgApplication) continue;
            if (hasDegreeType && registration?.DegreeTypeId != degreeTypeGuid) continue;

            var seatNames = new List<string>();
            if (appData.SeatTypes?.Any() == true)
            {
                seatNames = appData.SeatTypes
                    .Select(s =>
                    {
                        if (!string.IsNullOrWhiteSpace(s.SeatTypeName)) return s.SeatTypeName;
                        if (s.SeatTypeId.HasValue && lookupMap.TryGetValue(s.SeatTypeId.Value, out var stName))
                            return stName;
                        return null;
                    })
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct()
                    .ToList()!;
            }

            bool isInService = seatNames.Any(s => s.Contains("In-Service", StringComparison.OrdinalIgnoreCase));
            if (!isInService) continue;

            verificationMap.TryGetValue(app.AppNo ?? "", out var verification);
            if (!string.Equals(verification?.VerificationStatus, "Accepted", StringComparison.OrdinalIgnoreCase))
                continue;

            string categoryName = app.CategoryId.HasValue &&
                lookupMap.TryGetValue(app.CategoryId.Value, out var catName)
                    ? catName : "GM";

            if (categoryFilter.Count > 0 &&
                !categoryFilter.Any(c => NormalizeCategory(c) == NormalizeCategory(categoryName)))
                continue;

            pgEducationMap.TryGetValue(app.Id, out var pgDetailsList);
            float meritScore = ResolvePgOverallPercentage(pgDetailsList ?? new List<PgEducationDetailDto>());
            if (meritScore < 0f) continue;

            if (appData.CourseDetails == null) continue;

            foreach (var cd in appData.CourseDetails)
            {
                string degreeName = cd.DegreeId.HasValue && degreeMap.TryGetValue(cd.DegreeId.Value, out var dn) ? dn : "—";
                string courseName = cd.CourseId.HasValue && courseMap.TryGetValue(cd.CourseId.Value, out var cn) ? cn : "—";
                int prefRank = ParsePreferenceRank(cd.Preference);

                var row = new MeritListReportRow
                {
                    AppNo = app.AppNo ?? "—",
                    Name = app.Name ?? "—",
                    Category = categoryName,
                    Preference = prefRank > 0 ? $"P{prefRank}" : (cd.Preference ?? "No Pref"),
                    MeritScore = meritScore,
                    Percentage = meritScore,
                    DegreeName = degreeName,
                };

                flatRows.Add(row);
                courseKeyByRow[row] = (degreeName, courseName);
            }
        }

        var grouped = flatRows
            .GroupBy(r => courseKeyByRow[r])
            .Select(g =>
            {
                var ranked = g.OrderByDescending(r => r.MeritScore).ThenBy(r => r.Name).ToList();
                for (int i = 0; i < ranked.Count; i++) ranked[i].Rank = i + 1;
                return new PgInServiceCourseGroup
                {
                    DegreeName = g.Key.Degree,
                    CourseName = g.Key.Course,
                    Applicants = ranked,
                };
            })
            .OrderBy(g => g.DegreeName).ThenBy(g => g.CourseName)
            .ToList();

        return grouped;
    }
    
        [HttpGet("pg-inservice-course-wise-list")]
    public async Task<IActionResult> GetPgInServiceCourseWiseList(
        [FromQuery] string? degreeTypeId = null,
        [FromQuery] string? category = null,
        [FromQuery] string format = "json",
        [FromQuery] bool download = false)
    {
        try
        {
            var groups = await BuildPgInServiceCourseWiseAsync(degreeTypeId, category);

            if (format.Equals("pdf", StringComparison.OrdinalIgnoreCase))
            {
                byte[]? logoBytes = await _fileService.GetLogoBytesAsync();
                string? degreeTypeName = null;
                if (Guid.TryParse(degreeTypeId, out var dtGuid))
                {
                    var lookupMap = (await _lookupService.GetAllAsync())
                        .ToDictionary(x => x.Id, x => x.Name ?? x.Code ?? x.Id.ToString());
                    lookupMap.TryGetValue(dtGuid, out degreeTypeName);
                }

                var reportData = new PgInServiceReportData
                {
                    Groups = groups,
                    LogoBytes = logoBytes,
                    AcademicYear = "2026–27",
                    DegreeTypeName = degreeTypeName,
                    CategoryFilter = category,
                };

                var pdfBytes = new PgInServiceReport(reportData).GeneratePdf();
                return download
                    ? File(pdfBytes, "application/pdf", $"PgInServiceCourseWise_{DateTime.Now:yyyyMMddHHmmss}.pdf")
                    : File(pdfBytes, "application/pdf");
            }

            return Ok(groups.Select(g => new
            {
                degreeName = g.DegreeName,
                courseName = g.CourseName,
                applicants = g.Applicants.Select(a => new
                {
                    rank = a.Rank,
                    appNo = a.AppNo,
                    name = a.Name,
                    category = a.Category,
                    preference = a.Preference,
                    meritScore = a.MeritScore,
                })
            }));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching PG in-service course-wise list", error = ex.Message });
        }
    }
    private async Task<List<DocumentVerificationReportRow>> BuildVerificationRowsAsync(
        string? degreeId, string? courseId, string? academicYearId,
        string? category, string? seatType, string? karnataka, string? status)
    {
        var filter = new ApplicationFilterDto
        {
            DegreeId = Guid.TryParse(degreeId, out var dg) ? dg : (Guid?)null,
            CourseId = Guid.TryParse(courseId, out var cg) ? cg : (Guid?)null,
            AcademicYearId = Guid.TryParse(academicYearId, out var ag) ? ag : (Guid?)null,
        };

        var allApps = await _queryService.FilterAsync(filter);
        var lookupMap = (await _lookupService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.Name ?? x.Code ?? x.Id.ToString());

        var categoryFilter = SplitFilter(category);
        var seatTypeFilter = SplitFilter(seatType);
        var verificationMap = await GetVerificationMapAsync();

        var rows = new List<DocumentVerificationReportRow>();
        int sl = 1;

        foreach (var appData in allApps)
        {
            var app = appData.Application;
            if (app == null) continue;

            var seatNames = new List<string>();
            if (appData.SeatTypes?.Any() == true)
            {
                seatNames = appData.SeatTypes
    .Select(s =>
    {
        if (!string.IsNullOrWhiteSpace(s.SeatTypeName))
            return s.SeatTypeName;

        if (s.SeatTypeId.HasValue &&
            lookupMap.TryGetValue(s.SeatTypeId.Value, out string? stName))
            return stName ?? string.Empty;

        return string.Empty;
    })
    .Where(x => !string.IsNullOrWhiteSpace(x))
    .Select(x => x!)
    .Distinct()
    .ToList();
            }


            var studentType = DetermineStudentType(app, seatNames);
            if (!PassesKarnatakaFilter(karnataka, studentType)) continue;

            string categoryName = app.CategoryId.HasValue &&
       lookupMap.TryGetValue(app.CategoryId.Value, out string? catName)
           ? catName ?? "—"
           : "—";


            if (categoryFilter.Count > 0 &&
                !categoryFilter.Contains(categoryName, StringComparer.OrdinalIgnoreCase) &&
                !categoryFilter.Contains(app.CategoryId?.ToString() ?? "", StringComparer.OrdinalIgnoreCase))
                continue;


            if (seatTypeFilter.Count > 0 &&
                !seatNames.Any(n => seatTypeFilter.Contains(n, StringComparer.OrdinalIgnoreCase)))
                continue;




            if (appData.EducationDetails?.Any() == true)
            {
                float percentage = appData.EducationDetails?.Any() == true
       ? ResolveQualifyingPercentage(appData.EducationDetails)
       : -1f;          // <-- no education details submitted yet = automatic -1

                if (percentage < 0f) continue;
            }

            verificationMap.TryGetValue(app.AppNo ?? "", out var verification);

            if (!string.IsNullOrWhiteSpace(status))
            {
                var statusList = status
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .SelectMany(s => ExpandStatus(s))
                    .ToHashSet();


                string actualStatus = verification?.VerificationStatus ?? "Pending";
                string verStatus = NormalizeStatus(actualStatus);

                if (!statusList.Contains(verStatus))
                    continue;
            }
            string karnatakaDisplay = studentType switch
            {
                StudentType.HyderabadKarnataka => "HK",
                StudentType.NonKarnataka => "NK",
                _ => "KA"
            };

            rows.Add(new DocumentVerificationReportRow
            {
                Sl = sl++,
                AppNo = app.AppNo ?? "—",
                Name = app.Name ?? "—",
                Category = categoryName,
                SeatTypes = seatNames,
                Karnataka = karnatakaDisplay,
                Status = verification?.VerificationStatus ?? "Pending",
                Remark = verification?.Remark
            });
        }

        return rows;
    }


    private async Task<string> ResolveAcademicYearNameAsync(string? academicYearId)
    {
        if (string.IsNullOrWhiteSpace(academicYearId)) return "";
        var years = await _academicYearService.GetAllAsync();
        if (years == null) return "";
        if (Guid.TryParse(academicYearId, out var ayGuid))
            return years.FirstOrDefault(a => a.Id == ayGuid)?.Description ?? "";
        return years.FirstOrDefault(a => a.Id.ToString() == academicYearId)?.Description ?? "";
    }

    private static List<string> SplitFilter(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? new List<string>()
            : value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList();


    [HttpGet("fee-payment-list")]
    public async Task<IActionResult> GetFeePaymentList(
        [FromQuery] string? degreeId = null,
        [FromQuery] string? courseId = null,
        [FromQuery] string? academicYearId = null,
        [FromQuery] string? categoryId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? feeType = null)
    {
        try
        {
            var reportData = await BuildFeePaymentReportDataAsync(
                degreeId, courseId, academicYearId, categoryId, status, feeType);

            return Ok(new
            {
                summary = new
                {
                    totalApplications = reportData.TotalApplications,
                    totalCollected = reportData.TotalCollected,
                    totalPending = reportData.TotalPending,

                },
                feeStructures = reportData.FeeStructures.Select(fs => new
                {
                    feeName = fs.FeeName,
                    totalAmount = fs.TotalAmount,
                    category = fs.Category,
                    degreeName = fs.DegreeName,
                    courseName = fs.CourseName,
                    academicYear = fs.AcademicYear,
                    isActive = fs.IsActive,
                    deductionYn = fs.DeductionYn,
                    particulars = fs.Particulars.Select(p => new
                    {
                        particularName = p.ParticularName,
                        amount = p.Amount,
                    }),
                }),
                collections = reportData.Collections.Select(c => new
                {
                    sl = c.Sl,
                    appNo = c.AppNo,
                    name = c.Name,
                    feeType = c.FeeType,
                    amount = c.FeeStructureAmount,
                    platformFee = c.PlatformFee,
                    paidAmount = c.PaidAmount,
                    balance = c.Balance,
                    receiptNumber = c.ReceiptNumber,
                    paymentDate = c.PaymentDate,
                    status = c.Status,
                    settlementDate = c.SettlementDate,
                    settlementId = c.SettlementId,
                }),
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching fee payment list", error = ex.Message });
        }
    }


    [HttpGet("fee-payment-pdf")]
    public async Task<IActionResult> GenerateFeePaymentPdf(
        [FromQuery] string? degreeId = null,
        [FromQuery] string? courseId = null,
        [FromQuery] string? academicYearId = null,
        [FromQuery] string? categoryId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? feeType = null,
        [FromQuery] bool download = false)
    {
        try
        {
            var reportData = await BuildFeePaymentReportDataAsync(
     degreeId, courseId, academicYearId, categoryId, status, feeType);

            reportData.LogoBytes = await _fileService.GetLogoBytesAsync();

            var pdfBytes = new FeePaymentReport(reportData).GeneratePdf();

            var safeAY = !string.IsNullOrWhiteSpace(reportData.AcademicYear)
                                ? reportData.AcademicYear.Replace(" ", "").Replace("–", "-")
                                : "AY";
            var safeDegree = !string.IsNullOrWhiteSpace(reportData.DegreeName)
                                ? reportData.DegreeName.Replace(" ", "").Replace("/", "-")
                                : "General";
            string fileName = $"FeePaymentReport_{safeAY}_{safeDegree}.pdf";

            return download
                ? File(pdfBytes, "application/pdf", fileName)
                : File(pdfBytes, "application/pdf");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error generating Fee Payment PDF", error = ex.Message });
        }
    }
    private async Task<FeePaymentReportData> BuildFeePaymentReportDataAsync(
        string? degreeId,
        string? courseId,
        string? academicYearId,
        string? categoryId,
        string? statusFilter,
        string? feeTypeFilter = null)
    {
        var degreeMap = (await _degreeService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.DegreeName ?? x.Id.ToString());

        var courseMap = (await _courseService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.Name ?? x.Id.ToString());

        var lookupMap = (await _lookupService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.Name ?? x.Code ?? x.Id.ToString());

        bool hasDegree = Guid.TryParse(degreeId, out Guid dGuid);
        bool hasCourse = Guid.TryParse(courseId, out Guid cGuid);
        bool hasCategory = Guid.TryParse(categoryId, out Guid catGuid);
        bool hasAY = Guid.TryParse(academicYearId, out Guid ayGuid);

        string degreeName = hasDegree && degreeMap.TryGetValue(dGuid, out var dn) ? dn : "";
        string courseName = hasCourse && courseMap.TryGetValue(cGuid, out var cn) ? cn : "";
        string categoryName = hasCategory && lookupMap.TryGetValue(catGuid, out var kn) ? kn : "";
        string academicYearName = await ResolveAcademicYearNameAsync(academicYearId);
        HashSet<Guid>? allowedApplicationIds = null;

        if (hasDegree || hasCourse || hasAY)
        {
            var matchingApps = await _queryService.FilterAsync(new ApplicationFilterDto
            {
                DegreeId = hasDegree ? dGuid : (Guid?)null,
                CourseId = hasCourse ? cGuid : (Guid?)null,
                AcademicYearId = hasAY ? ayGuid : (Guid?)null
            });

            allowedApplicationIds = matchingApps
                .Where(a => a.Application != null)
                .Select(a => (Guid)a.Application!.Id)
                .ToHashSet();

            if (allowedApplicationIds.Count == 0)
            {
                return new FeePaymentReportData
                {
                    AcademicYear = academicYearName,
                    DegreeName = degreeName,
                    CourseName = courseName,
                    CategoryFilter = categoryName,
                    StatusFilter = statusFilter,
                    FeeTypeFilter = feeTypeFilter,
                    GeneratedBy = _currentUser?.Username ?? "Admin",
                    ReportTitle = "Fee Payment Report",
                    Collections = new List<FeeCollectionRow>(),
                    FeeStructures = new List<FeeStructureRow>()
                };
            }
        }

        var allStructures = await _feeStructureService.GetAllAsync();

        if (hasDegree) allStructures = allStructures.Where(fs => fs.DegreeId == dGuid).ToList();
        if (hasCourse) allStructures = allStructures.Where(fs => fs.CourseId == cGuid).ToList();
        if (hasAY) allStructures = allStructures.Where(fs => fs.AcademicYearId == ayGuid).ToList();

        if (!string.IsNullOrWhiteSpace(feeTypeFilter))
            allStructures = allStructures
                .Where(fs => fs.FeeName?.Contains(feeTypeFilter, StringComparison.OrdinalIgnoreCase) == true)
                .ToList();

        var displayStructures = hasCategory
            ? allStructures.Where(fs => fs.CategoryId == catGuid).ToList()
            : allStructures;

        var feeStructureRows = displayStructures
            .Where(fs => fs.Status == true)
            .Select(fs => new FeeStructureRow
            {
                FeeName = fs.FeeName ?? string.Empty,
                TotalAmount = fs.TotalAmount,
                Category = fs.CategoryId.HasValue && lookupMap.TryGetValue(fs.CategoryId.Value, out var fc1) ? fc1 : categoryName,
                DegreeName = fs.DegreeId.HasValue && degreeMap.TryGetValue(fs.DegreeId.Value, out var fd1) ? fd1 : degreeName,
                CourseName = fs.CourseId.HasValue && courseMap.TryGetValue(fs.CourseId.Value, out var fc2) ? fc2 : courseName,
                AcademicYear = academicYearName,
                IsActive = true,
                DeductionYn = fs.DeductionYn == true,
                Particulars = fs.Details?
                    .Where(d => d.Status == true)
                    .OrderBy(d => d.ParticularName)
                    .Select(d => new FeeParticularsRow { ParticularName = d.ParticularName, Amount = d.Amount })
                    .ToList() ?? new List<FeeParticularsRow>()
            })
            .OrderBy(f => f.FeeName)
            .ToList();

        var baseAdmissionStructures = (await _feeStructureService.GetAllAsync())
            .Where(fs => fs.Status == true && fs.TotalAmount > 0)
            .ToList();

        if (hasDegree) baseAdmissionStructures = baseAdmissionStructures.Where(fs => fs.DegreeId == dGuid).ToList();
        if (hasCourse) baseAdmissionStructures = baseAdmissionStructures.Where(fs => fs.CourseId == cGuid).ToList();

        static bool IsSuccess(string? s) => s?.ToLower() is "success" or "sucess" or "paid";

        var allCollections = await _feeCollectionService.GetAllAsync();

        var feeTypeList = string.IsNullOrWhiteSpace(feeTypeFilter)
            ? new List<string>()
            : feeTypeFilter
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim().ToLower())
                .ToList();

        var filtered = allCollections
            .Where(fc =>
                (allowedApplicationIds == null ||
                 (fc.ApplicationId != Guid.Empty && allowedApplicationIds.Contains(fc.ApplicationId)))
                && IsSuccess(fc.Status)
                && (feeTypeList.Count == 0 || feeTypeList.Any(ft => (fc.FeeType ?? "").ToLower().Contains(ft)))
            )
            .OrderBy(fc => fc.Name)
            .ThenBy(fc => fc.PaymentDate)
            .ToList();

        var appDetailList = await _queryService.FilterAsync(new ApplicationFilterDto
        {
            DegreeId = hasDegree ? dGuid : (Guid?)null,
            CourseId = hasCourse ? cGuid : (Guid?)null,
            AcademicYearId = hasAY ? ayGuid : (Guid?)null   // FIX 1 (same reasoning): scope this lookup too
        });

        var appDetailMap = appDetailList
            .Where(a => a.Application != null &&
                        (allowedApplicationIds == null || allowedApplicationIds.Contains((Guid)a.Application.Id)))
            .ToDictionary(a => (Guid)a.Application!.Id, a => a);
        var appResolvedDetails = appDetailMap
            .ToDictionary(
                kvp => kvp.Key,
                kvp =>
                {
                    Guid? degId = hasDegree ? dGuid : (Guid?)null;
                    Guid? crsId = hasCourse ? cGuid : (Guid?)null;
                    Guid? catId = null;
                    Guid? ayId = null;

                    try
                    {
                        var app = kvp.Value.Application;
                        if (app?.CategoryId != null)
                            catId = (Guid?)app.CategoryId;
                        if (app?.AcademicYearId != null)
                            ayId = (Guid?)app.AcademicYearId;
                    }
                    catch { }

                    if (degId == null || crsId == null)
                    {
                        try
                        {
                            var cd = kvp.Value.CourseDetails?.FirstOrDefault();
                            if (cd != null)
                            {
                                if (degId == null) try { degId = (Guid?)cd.DegreeId; } catch { }
                                if (crsId == null) try { crsId = (Guid?)cd.CourseId; } catch { }
                            }
                        }
                        catch { }
                    }

                    return (DegreeId: degId, CourseId: crsId, AcademicYearId: ayId, CategoryId: catId);
                });

        var admissionPaidPerApp = allCollections
            .Where(fc =>
                IsSuccess(fc.Status) &&
                fc.FeeType?.Contains("Admission", StringComparison.OrdinalIgnoreCase) == true &&
                (allowedApplicationIds == null || allowedApplicationIds.Contains(fc.ApplicationId)))
            .GroupBy(fc => fc.ApplicationId)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(fc => fc.PaidAmount));

        int sl = 1;

        var collectionRows = filtered.Select(fc =>
        {
            bool isApplicationFee = fc.FeeType?.Contains("Application", StringComparison.OrdinalIgnoreCase) == true;
            bool isAdmissionFee = fc.FeeType?.Contains("Admission", StringComparison.OrdinalIgnoreCase) == true;

            decimal dbAmount = 0m;
            decimal dbPaidAmount = 0m;
            decimal dbPlatformCharge = 0m;

            try { dbAmount = fc.Amount != null ? Convert.ToDecimal(fc.Amount) : 0m; } catch { }
            try { dbPaidAmount = fc.PaidAmount != null ? Convert.ToDecimal(fc.PaidAmount) : 0m; } catch { }
            try { dbPlatformCharge = fc.PlatformCharges != null ? Convert.ToDecimal(fc.PlatformCharges) : 0m; } catch { }

            decimal feeStructureAmount = 0m;
            decimal balance = 0m;

            if (isApplicationFee)
            {
                feeStructureAmount = dbAmount;
                balance = 0m;
            }
            else if (isAdmissionFee)
            {
                Guid? appDegreeId = null;
                Guid? appCourseId = null;
                Guid? appAcademicYearId = null;
                Guid? appCategoryId = null;

                if (appResolvedDetails.TryGetValue(fc.ApplicationId, out var resolved))
                {
                    appDegreeId = resolved.DegreeId;
                    appCourseId = resolved.CourseId;
                    appAcademicYearId = resolved.AcademicYearId;
                    appCategoryId = resolved.CategoryId;
                }

                var matchedStructure =
                    baseAdmissionStructures.FirstOrDefault(fs =>
                        fs.DegreeId == appDegreeId &&
                        fs.CourseId == appCourseId &&
                        fs.AcademicYearId == appAcademicYearId &&
                        fs.CategoryId == appCategoryId)

                    ?? baseAdmissionStructures.FirstOrDefault(fs =>
                        fs.DegreeId == appDegreeId &&
                        fs.CourseId == appCourseId &&
                        fs.AcademicYearId == appAcademicYearId &&
                        !fs.CategoryId.HasValue)

                    ?? baseAdmissionStructures.FirstOrDefault(fs =>
                        fs.DegreeId == appDegreeId &&
                        fs.CourseId == appCourseId &&
                        fs.AcademicYearId == appAcademicYearId)

                    ?? baseAdmissionStructures.FirstOrDefault(fs =>
                        fs.DegreeId == appDegreeId &&
                        fs.CourseId == appCourseId &&
                        !fs.CategoryId.HasValue)

                    ?? baseAdmissionStructures.FirstOrDefault(fs =>
                        fs.DegreeId == appDegreeId &&
                        fs.CourseId == appCourseId);

                feeStructureAmount = matchedStructure?.TotalAmount ?? 0m;

                decimal totalPaidForApp = admissionPaidPerApp.TryGetValue(fc.ApplicationId, out var tp)
                    ? tp : dbPaidAmount;

                balance = feeStructureAmount - totalPaidForApp;
                if (balance < 0m) balance = 0m;
            }

            return new FeeCollectionRow
            {
                Sl = sl++,
                AppNo = fc.ApplicationNo,
                Name = fc.Name ?? "—",
                FeeType = fc.FeeType,
                FeeStructureAmount = feeStructureAmount,
                PlatformFee = dbPlatformCharge,
                PaidAmount = dbPaidAmount,
                Balance = balance,
                PaymentDate = fc.PaymentDate?.ToString("dd/MM/yyyy"),
                Status = fc.Status ?? "Success",
                TransactionId = fc.TransactionId,
                OrderId = fc.OrderId,
                ReceiptNumber = fc.ReceiptNumber,
                Email = fc.Email,
                Mobile = fc.Mobile,
                SettlementDate = fc.SettlementDate?.ToString("dd/MM/yyyy"),
                SettlementId = fc.SettlementId
            };
        }).ToList();

        decimal totalCollected = collectionRows.Sum(c => c.PaidAmount);
        decimal totalPending = collectionRows.Where(c => c.Balance > 0).Sum(c => c.Balance);

        return new FeePaymentReportData
        {
            AcademicYear = academicYearName,
            DegreeName = degreeName,
            CourseName = courseName,
            CategoryFilter = categoryName,
            StatusFilter = statusFilter,
            FeeTypeFilter = feeTypeFilter,
            GeneratedBy = _currentUser?.Username ?? "Admin",
            ReportTitle = "Fee Payment Report",
            TotalApplications = collectionRows.Count,
            TotalCollected = totalCollected,
            TotalPending = totalPending,
            FeeStructures = feeStructureRows,
            Collections = collectionRows
        };
    }
    [HttpGet("facility-report-list")]
    public async Task<IActionResult> GetFacilityReportList(
        [FromQuery] string? degreeId = null,
        [FromQuery] string? courseId = null,
        [FromQuery] string? academicYearId = null,
        [FromQuery] string? facilityType = null,
        [FromQuery] string? gender = null,
        [FromQuery] string? status = null,
        [FromQuery] string format = "json",
        [FromQuery] bool download = false)
    {
        try
        {
            var type = string.Equals(facilityType, "Hostel", StringComparison.OrdinalIgnoreCase)
                ? FacilityType.Hostel
                : FacilityType.Transport;

            var rows = await BuildFacilityRowsAsync(
                type, degreeId, courseId, academicYearId, null, gender);

            if (!string.IsNullOrWhiteSpace(status))
            {
                var statusList = status
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .SelectMany(s => ExpandStatus(s))
                    .ToHashSet();

                rows = rows
                    .Where(r => statusList.Contains(NormalizeStatus(r.VerificationStatus)))
                    .ToList();

                for (int i = 0; i < rows.Count; i++) rows[i].Sl = i + 1;
            }

            int totalMale = rows.Count(r => (r.Gender ?? "").StartsWith("M", StringComparison.OrdinalIgnoreCase));
            int totalFemale = rows.Count(r => (r.Gender ?? "").StartsWith("F", StringComparison.OrdinalIgnoreCase));
            int totalOther = rows.Count - totalMale - totalFemale;

            if (format.Equals("pdf", StringComparison.OrdinalIgnoreCase))
            {
                var degreeMap = (await _degreeService.GetAllAsync())
                                    .ToDictionary(x => x.Id, x => x.DegreeName ?? x.Id.ToString());
                var courseMap = (await _courseService.GetAllAsync())
                                    .ToDictionary(x => x.Id, x => x.Name ?? x.Id.ToString());

                string degreeName = Guid.TryParse(degreeId, out var dg) &&
                                        degreeMap.TryGetValue(dg, out var dn) ? dn : "";
                string courseName = Guid.TryParse(courseId, out var cg) &&
                                        courseMap.TryGetValue(cg, out var cn) ? cn : "";
                string academicYearName = await ResolveAcademicYearNameAsync(academicYearId);

                var catBreakdown = rows
                    .GroupBy(r => r.Category ?? "—", StringComparer.OrdinalIgnoreCase)
                    .Select(g => new FacilityCategoryRow
                    {
                        Category = g.Key,
                        Count = g.Count(),
                        Male = g.Count(r => (r.Gender ?? "").StartsWith("M", StringComparison.OrdinalIgnoreCase)),
                        Female = g.Count(r => (r.Gender ?? "").StartsWith("F", StringComparison.OrdinalIgnoreCase)),
                    })
                    .OrderBy(c => c.Category)
                    .ToList();
                byte[]? logoBytes = await _fileService.GetLogoBytesAsync();

                var reportData = new FacilityReportData
                {
                    LogoBytes = logoBytes,
                    AcademicYear = !string.IsNullOrWhiteSpace(academicYearName) ? academicYearName : "2026–27",
                    DegreeName = degreeName,
                    CourseName = courseName,
                    GenderFilter = gender,
                    StatusFilter = status,
                    GeneratedBy = _currentUser?.Username ?? "Admin",
                    FacilityType = type,
                    Rows = rows,
                    TotalMale = totalMale,
                    TotalFemale = totalFemale,
                    TotalOther = totalOther,
                    CategoryBreakdown = catBreakdown,
                };

                var pdfBytes = new FacilityReport(reportData).GeneratePdf();
                string fileName = $"{facilityType ?? "Facility"}Report_{DateTime.Now:yyyyMMddHHmmss}.pdf";

                return download
                    ? File(pdfBytes, "application/pdf", fileName)
                    : File(pdfBytes, "application/pdf");
            }

            return Ok(new
            {
                rows = rows.Select(r => new
                {
                    sl = r.Sl,
                    appNo = r.AppNo,
                    name = r.Name,
                    fatherName = r.FatherName,
                    gender = r.Gender,
                    category = r.Category,
                    degreeName = r.DegreeName,
                    courseName = r.CourseName,
                    phone = r.Phone,
                    hostelFacility = r.HostelFacility,
                    transportFacility = r.TransportFacility,
                    verificationStatus = r.VerificationStatus,
                }),
                totalMale,
                totalFemale,
                totalOther,
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error fetching facility report",
                error = ex.Message,
                stackTrace = ex.StackTrace,
                inner = ex.InnerException?.Message
            });
        }
    }

    private async Task<List<FacilityReportRow>> BuildFacilityRowsAsync(
        FacilityType facilityType,
        string? degreeId,
        string? courseId,
        string? academicYearId,
        string? category,
        string? genderFilter)
    {

        var filter = new ApplicationFilterDto
        {
            DegreeId = Guid.TryParse(degreeId, out var dg) ? dg : (Guid?)null,
            CourseId = Guid.TryParse(courseId, out var cg) ? cg : (Guid?)null,
            AcademicYearId = Guid.TryParse(academicYearId, out var ag) ? ag : (Guid?)null,
        };

        var allApps = await _queryService.FilterAsync(filter);
        var verificationMap = await GetVerificationMapAsync();
        var lookupMap = (await _lookupService.GetAllAsync())
                            .ToDictionary(x => x.Id, x => x.Name ?? x.Code ?? x.Id.ToString());
        var degreeMap = (await _degreeService.GetAllAsync())
                            .ToDictionary(x => x.Id, x => x.DegreeName ?? x.Id.ToString());
        var courseMap = (await _courseService.GetAllAsync())
                            .ToDictionary(x => x.Id, x => x.Name ?? x.Id.ToString());

        var categoryTokens = SplitFilter(category);

        var categoryNameFilters = categoryTokens
            .Select(token =>
            {
                if (Guid.TryParse(token, out var catGuid) &&
                    lookupMap.TryGetValue(catGuid, out var resolved))
                    return resolved;
                return token;
            })
            .ToList();

        string? normGender = string.IsNullOrWhiteSpace(genderFilter)
            ? null
            : genderFilter.Trim();

        var rows = new List<FacilityReportRow>();

        foreach (var appData in allApps)
        {
            var app = appData.Application;
            var courses = appData.CourseDetails;

            if (app == null || courses == null || !courses.Any())
                continue;

            bool wantsHostel = courses.Any(x => SafeBool((object?)x.HostelFacilityYn));
            bool wantsTransport = courses.Any(x => SafeBool((object?)x.TransportFacilityYn));

            if (facilityType == FacilityType.Hostel && !wantsHostel) continue;
            if (facilityType == FacilityType.Transport && !wantsTransport) continue;


            string categoryName = app.CategoryId.HasValue &&
                lookupMap.TryGetValue(app.CategoryId.Value, out var catName)
                    ? catName : "GM";

            string genderName = app.Gender.HasValue &&
                lookupMap.TryGetValue(app.Gender.Value, out var genName)
                    ? genName : "";


            if (categoryNameFilters.Count > 0)
            {
                bool matched = categoryNameFilters.Any(f =>
                    string.Equals(f, categoryName, StringComparison.OrdinalIgnoreCase) ||
                    NormalizeCategory(f) == NormalizeCategory(categoryName));

                if (!matched && app.CategoryId.HasValue)
                    matched = categoryTokens.Any(t =>
                        string.Equals(t, app.CategoryId.Value.ToString(), StringComparison.OrdinalIgnoreCase));

                if (!matched) continue;
            }


            if (normGender != null)
            {
                bool genderMatch =
                    string.Equals(genderName, normGender, StringComparison.OrdinalIgnoreCase) ||
                    (normGender.Length == 1 &&
                    genderName.StartsWith(normGender, StringComparison.OrdinalIgnoreCase)) ||
                    (genderName.Length > 0 &&
                    genderName[..1].Equals(normGender[..1], StringComparison.OrdinalIgnoreCase));

                if (!genderMatch) continue;
            }


            var c = courses.First();
            string degreeName = degreeMap.TryGetValue((Guid)c.DegreeId, out var dn) ? dn : "";
            string crsName = courseMap.TryGetValue((Guid)c.CourseId, out var cn) ? cn : "";


            string verificationStatus = "Pending";
            var appNoKey = app.AppNo?.ToString();
            if (!string.IsNullOrWhiteSpace(appNoKey) && verificationMap.TryGetValue(appNoKey, out var verification))
                verificationStatus = verification?.VerificationStatus ?? "Pending";

            rows.Add(new FacilityReportRow
            {
                AppNo = app.AppNo?.ToString() ?? "—",
                Name = app.Name?.ToString() ?? "—",
                FatherName = app.FatherName?.ToString() ?? "",
                Gender = genderName,
                Category = categoryName,
                DegreeName = degreeName,
                CourseName = crsName,
                Phone = app.Phone?.ToString(),
                HostelFacility = wantsHostel,
                TransportFacility = wantsTransport,
                VerificationStatus = verificationStatus,
            });
        }


        var sorted = rows.OrderBy(r => r.Name).ToList();
        for (int i = 0; i < sorted.Count; i++) sorted[i].Sl = i + 1;

        return sorted;
    }

    [HttpGet("admitted-students-list")]
    public async Task<IActionResult> GetAdmittedStudentsList(
    [FromQuery] string? degreeId = null,
    [FromQuery] string? courseId = null,
    [FromQuery] string? academicYearId = null,
    [FromQuery] string? category = null,
    [FromQuery] bool? admitYn = null,
    [FromQuery] string format = "json",
    [FromQuery] bool download = false)
    {
        try
        {
            var rows = await BuildAdmittedStudentRowsAsync(
                degreeId, courseId, academicYearId, category, admitYn);

            if (format.Equals("pdf", StringComparison.OrdinalIgnoreCase))
            {
                byte[]? logoBytes = await _fileService.GetLogoBytesAsync();
                var degreeMap = (await _degreeService.GetAllAsync()).ToDictionary(x => x.Id, x => x.DegreeName ?? x.Id.ToString());
                var courseMap = (await _courseService.GetAllAsync()).ToDictionary(x => x.Id, x => x.Name ?? x.Id.ToString());

                string degreeName = Guid.TryParse(degreeId, out var dg) && degreeMap.TryGetValue(dg, out var dn) ? dn : "";
                string courseName = Guid.TryParse(courseId, out var cg) && courseMap.TryGetValue(cg, out var cn) ? cn : "";
                string academicYearName = await ResolveAcademicYearNameAsync(academicYearId);

                string? categoryDisplay = !string.IsNullOrWhiteSpace(category)
                    ? string.Join(", ", category.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                    : null;

                var categoryBreakdown = rows
                    .GroupBy(r => r.Category, StringComparer.OrdinalIgnoreCase)
                    .Select(g => new AdmittedCategoryBreakdownRow
                    {
                        Category = g.Key,
                        Total = g.Count(),
                        Admitted = g.Count(r => r.AdmitYn),
                        NotAdmitted = g.Count(r => !r.AdmitYn),
                    })
                    .OrderBy(c => c.Category)
                    .ToList();

                var reportData = new AdmittedStudentReportData
                {
                    Rows = rows,
                    LogoBytes = logoBytes,
                    DegreeName = degreeName,
                    CourseName = courseName,
                    CategoryFilter = categoryDisplay,
                    AcademicYear = !string.IsNullOrWhiteSpace(academicYearName) ? academicYearName : "2026–27",
                    GeneratedBy = _currentUser?.Username ?? "Admin",
                    ReportTitle = "Admitted Students Report",
                    TotalAdmitted = rows.Count(r => r.AdmitYn),
                    TotalNotAdmitted = rows.Count(r => !r.AdmitYn),
                    CategoryBreakdown = categoryBreakdown,
                };

                var pdfBytes = new AdmittedStudentsReport(reportData).GeneratePdf();

                var safeAY = !string.IsNullOrWhiteSpace(academicYearName)
                    ? academicYearName.Replace(" ", "").Replace("–", "-") : "AY";
                var safeDegree = !string.IsNullOrWhiteSpace(degreeName)
                    ? degreeName.Replace(" ", "").Replace("/", "-") : "General";
                string fileName = $"AdmittedStudents_{safeAY}_{safeDegree}.pdf";

                return download
                    ? File(pdfBytes, "application/pdf", fileName)
                    : File(pdfBytes, "application/pdf");
            }

            return Ok(rows.Select(r => new
            {
                sl = r.Sl,
                applicationId = r.ApplicationId,
                applicationNo = r.ApplicationNo,
                name = r.Name,
                category = r.Category,
                degreeName = r.DegreeName,
                courseName = r.CourseName,
                admitYn = r.AdmitYn,
            }));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching admitted students list", error = ex.Message });
        }
    } 

    private async Task<List<AdmittedStudentReportRow>> BuildAdmittedStudentRowsAsync(
        string? degreeId,
        string? courseId,
        string? academicYearId,
        string? category,
        bool? admitYn)
    {

        var allAdmitted = await _admittedStudentService.GetAllAsync();

        IEnumerable<AdmittedStudentResponseDto> filtered = allAdmitted;
        if (admitYn.HasValue)
            filtered = filtered.Where(a => a.AdmitYn == admitYn.Value);


        var appFilter = new ApplicationFilterDto
        {
            DegreeId = Guid.TryParse(degreeId, out var dg) ? dg : (Guid?)null,
            CourseId = Guid.TryParse(courseId, out var cg) ? cg : (Guid?)null,
            AcademicYearId = Guid.TryParse(academicYearId, out var ag) ? ag : (Guid?)null,
        };

        var allApps = await _queryService.FilterAsync(appFilter);

        var lookupMap = (await _lookupService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.Name ?? x.Code ?? x.Id.ToString());
        var degreeMap = (await _degreeService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.DegreeName ?? x.Id.ToString());
        var courseMap = (await _courseService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.Name ?? x.Id.ToString());


        var appById = allApps
            .Where(a => a.Application != null)
           .ToDictionary(a => a.Application!.Id);

        var categoryFilter = SplitFilter(category);
        var rows = new List<AdmittedStudentReportRow>();

        foreach (var admitted in filtered)
        {

            if (!appById.TryGetValue(admitted.ApplicationId, out var appData))
                continue;

            var app = appData.Application;
            if (app == null) continue;


            string categoryName = app.CategoryId.HasValue &&
                lookupMap.TryGetValue(app.CategoryId.Value, out var catName)
                    ? catName : "GM";


            if (categoryFilter.Count > 0 &&
                !categoryFilter.Any(c => NormalizeCategory(c) == NormalizeCategory(categoryName)))
                continue;


            string degreeName = "";
            string crsName = "";
            if (appData.CourseDetails?.Any() == true)
            {
                var c = appData.CourseDetails.First();
                degreeName = degreeMap.TryGetValue((Guid)c.DegreeId, out var dn) ? dn : "";
                crsName = courseMap.TryGetValue((Guid)c.CourseId, out var cn) ? cn : "";
            }

            rows.Add(new AdmittedStudentReportRow
            {
                ApplicationId = admitted.ApplicationId,
                ApplicationNo = admitted.ApplicationNo,
                Name = admitted.Name ?? app.Name ?? "—",
                Category = categoryName,
                DegreeName = degreeName,
                CourseName = crsName,
                AdmitYn = admitted.AdmitYn,
            });
        }


        var sorted = rows.OrderBy(r => r.Name).ToList();
        for (int i = 0; i < sorted.Count; i++) sorted[i].Sl = i + 1;

        return sorted;
    }
    [HttpGet("manual-fee-list")]
    public async Task<IActionResult> GetManualFeeList(
        [FromQuery] string? degreeId = null,
        [FromQuery] string? courseId = null,
        [FromQuery] string? academicYearId = null,
        [FromQuery] string? feeType = null,
        [FromQuery] string format = "json",
        [FromQuery] bool download = false)
    {
        try
        {
            var reportData = await BuildManualFeeReportDataAsync(
                degreeId, courseId, academicYearId, feeType);

            if (format.Equals("pdf", StringComparison.OrdinalIgnoreCase))
            {
                reportData.LogoBytes = await _fileService.GetLogoBytesAsync();

                var pdfBytes = new ManualFeePaymentReport(reportData).GeneratePdf();

                var safeAY = !string.IsNullOrWhiteSpace(reportData.AcademicYear)
                    ? reportData.AcademicYear.Replace(" ", "").Replace("–", "-")
                    : "AY";

                var safeDegree = !string.IsNullOrWhiteSpace(reportData.DegreeName)
                    ? reportData.DegreeName.Replace(" ", "").Replace("/", "-")
                    : "General";

                var safeType = !string.IsNullOrWhiteSpace(feeType)
                    ? feeType.Replace(" ", "").Replace("-", "")
                    : "Manual";

                string fileName =
                    $"ManualFeeReport_{safeType}_{safeAY}_{safeDegree}.pdf";

                return download
                    ? File(pdfBytes, "application/pdf", fileName)
                    : File(pdfBytes, "application/pdf");
            }

            return Ok(new
            {
                summary = new
                {
                    totalRecords = reportData.TotalRecords,
                    totalCollected = reportData.TotalCollected,
                },

                collections = reportData.Collections.Select(c => new
                {
                    sl = c.Sl,
                    appNo = c.AppNo,
                    receiptNo = c.ReceiptNo,
                    feeName = c.FeeName,
                    feeAmount = c.FeeAmount,
                    transactionId = c.TransactionId,
                    orderId = c.OrderId,
                    paymentMode = c.PaymentMode,
                    paymentDate = c.PaymentDate,
                }),
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error fetching manual fee list",
                error = ex.Message
            });
        }
    }
    private async Task<ManualFeeReportData> BuildManualFeeReportDataAsync(
        string? degreeId,
        string? courseId,
        string? academicYearId,
        string? feeTypeFilter)
    {
        var degreeMap = (await _degreeService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.DegreeName ?? x.Id.ToString());

        var courseMap = (await _courseService.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.Name ?? x.Id.ToString());

        bool hasDegree = Guid.TryParse(degreeId, out Guid dGuid);
        bool hasCourse = Guid.TryParse(courseId, out Guid cGuid);
        bool hasAY = Guid.TryParse(academicYearId, out Guid ayGuid);

        string degreeName =
            hasDegree && degreeMap.TryGetValue(dGuid, out var dn)
                ? dn
                : "";

        string courseName =
            hasCourse && courseMap.TryGetValue(cGuid, out var cn)
                ? cn
                : "";

        string academicYearName =
            await ResolveAcademicYearNameAsync(academicYearId);


        HashSet<string>? allowedAppNos = null;

        if (hasDegree || hasCourse || hasAY)
        {
            var matchingApps = await _queryService.FilterAsync(
                new ApplicationFilterDto
                {
                    DegreeId = hasDegree ? dGuid : (Guid?)null,
                    CourseId = hasCourse ? cGuid : (Guid?)null,
                    AcademicYearId = hasAY ? ayGuid : (Guid?)null,
                });

            allowedAppNos = matchingApps
                .Where(a => a.Application?.AppNo != null)
                .Select(a => a.Application!.AppNo!)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            if (allowedAppNos.Count == 0)
            {
                return new ManualFeeReportData
                {
                    AcademicYear = academicYearName,
                    DegreeName = degreeName,
                    CourseName = courseName,
                    FeeTypeFilter = feeTypeFilter,
                    GeneratedBy = _currentUser?.Username ?? "Admin",
                    ReportTitle = BuildManualReportTitle(feeTypeFilter),

                    TotalRecords = 0,

                    TotalCollected = 0,


                    Collections = new List<ManualFeeCollectionRow>()
                };
            }
        }

        var feeStructures = (await _feeStructureService.GetAllAsync())
            .Where(fs => fs.Status == true && fs.TotalAmount > 0)
            .ToList();

        if (hasDegree)
            feeStructures = feeStructures
                .Where(fs => fs.DegreeId == dGuid)
                .ToList();

        if (hasCourse)
            feeStructures = feeStructures
                .Where(fs => fs.CourseId == cGuid)
                .ToList();


        var allManual = await _manualFeeService.GetAllAsync();

        IEnumerable<dynamic> filtered = allManual;


        if (!string.IsNullOrWhiteSpace(feeTypeFilter))
        {
            bool isApplication =
                feeTypeFilter.Contains(
                    "Application",
                    StringComparison.OrdinalIgnoreCase);

            bool isAdmission =
                feeTypeFilter.Contains(
                    "Admission",
                    StringComparison.OrdinalIgnoreCase);

            if (isApplication && !isAdmission)
            {
                filtered = filtered.Where(x =>
                {
                    try
                    {
                        return ((string?)x.FeeName)?
                            .StartsWith(
                                "Application",
                                StringComparison.OrdinalIgnoreCase) == true;
                    }
                    catch
                    {
                        return false;
                    }
                });
            }
            else if (isAdmission && !isApplication)
            {
                filtered = filtered.Where(x =>
                {
                    try
                    {
                        return ((string?)x.FeeName)?
                            .StartsWith(
                                "Admission",
                                StringComparison.OrdinalIgnoreCase) == true;
                    }
                    catch
                    {
                        return false;
                    }
                });
            }
        }


        if (allowedAppNos != null)
        {
            filtered = filtered.Where(x =>
            {
                try
                {
                    string? appNo = x.AppNo?.ToString();

                    return !string.IsNullOrWhiteSpace(appNo)
                        && allowedAppNos.Contains(appNo);
                }
                catch
                {
                    return false;
                }
            });
        }


        var rows = new List<ManualFeeCollectionRow>();

        int sl = 1;

        foreach (var x in filtered.OrderBy(x =>
        {
            try { return x.AppNo?.ToString() ?? ""; }
            catch { return ""; }
        }))
        {
            decimal feeAmount = 0m;

            try
            {
                if (x.FeeAmount != null)
                    feeAmount = Convert.ToDecimal(x.FeeAmount);
            }
            catch { }

            decimal totalAmount = 0m;

            try
            {
                string? feeName = x.FeeName?.ToString();

                var matched =
                    feeStructures.FirstOrDefault(fs =>
                        fs.FeeName != null &&
                        fs.FeeName.Equals(
                            feeName,
                            StringComparison.OrdinalIgnoreCase))

                    ?? feeStructures.FirstOrDefault(fs =>
                        fs.FeeName != null &&
                        feeName != null &&
                        fs.FeeName.Contains(
                            feeName,
                            StringComparison.OrdinalIgnoreCase))

                    ?? feeStructures.FirstOrDefault(fs =>
                        fs.FeeName != null &&
                        feeName != null &&
                        feeName.Contains(
                            fs.FeeName,
                            StringComparison.OrdinalIgnoreCase));

                if (matched != null)
                {
                    totalAmount = matched.TotalAmount;
                }
            }
            catch { }

            decimal balance =
                totalAmount > 0
                    ? Math.Max(0m, totalAmount - feeAmount)
                    : 0m;

            string? rawDate = null;

            try
            {
                if (x.PaymentDate != null)
                {
                    var dt = Convert.ToDateTime(x.PaymentDate);

                    rawDate = dt.ToString("dd/MM/yyyy");
                }
            }
            catch { }

            rows.Add(new ManualFeeCollectionRow
            {
                Sl = sl++,
                AppNo = x.AppNo?.ToString(),
                ReceiptNo = x.ReceiptNo?.ToString() ?? "—",
                FeeName = x.FeeName?.ToString() ?? "—",


                FeeAmount = feeAmount,


                TransactionId = x.TransactionId?.ToString(),
                OrderId = x.OrderId?.ToString(),
                PaymentMode = x.PaymentMode?.ToString(),
                PaymentDate = rawDate,
            });
        }


        decimal totalCollected = rows.Sum(r => r.FeeAmount);


        return new ManualFeeReportData
        {
            AcademicYear = academicYearName,
            DegreeName = degreeName,
            CourseName = courseName,
            FeeTypeFilter = feeTypeFilter,
            GeneratedBy = _currentUser?.Username ?? "Admin",

            ReportTitle = BuildManualReportTitle(feeTypeFilter),

            TotalRecords = rows.Count,

            TotalCollected = totalCollected,


            Collections = rows,
        };
    }
    private static string BuildManualReportTitle(string? feeTypeFilter)
    {
        if (string.IsNullOrWhiteSpace(feeTypeFilter))
            return "Manual Fee Collection Report";

        if (feeTypeFilter.Contains(
            "Application",
            StringComparison.OrdinalIgnoreCase))
        {
            return "Application Fee – Manual Collection Report";
        }

        if (feeTypeFilter.Contains(
            "Admission",
            StringComparison.OrdinalIgnoreCase))
        {
            return "Admission Fee – Manual Collection Report";
        }

        return "Manual Fee Collection Report";
    }

    [HttpGet("hall-ticket")]
    public async Task<IActionResult> GenerateHallTicket(
        [FromQuery] string appNo,
        [FromQuery] bool download = false)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(appNo))
                return BadRequest(new { message = "App number is required." });


            var appData = await _queryService.GetByAppNoAsync(appNo);
            if (appData?.Application == null)
                return NotFound(new { message = "Application not found." });

            var app = appData.Application;
            var applicationId = (Guid)app.Id;


            var allExamApps = await _examApplicationService.GetAllAsync();
            var examApp = allExamApps
                .FirstOrDefault(e =>
                    string.Equals(e.ApplicationNo, appNo,
                        StringComparison.OrdinalIgnoreCase));

            if (examApp == null)
                return NotFound(new { message = "No exam application found for this student." });


            var examDetails = await _examApplicationService
                .GetDetailsByApplicationIdAsync(examApp.Id);

            if (examDetails == null || !examDetails.Any())
                return NotFound(new { message = "No exam subjects found for this student." });


            byte[]? logoBytes = await _fileService.GetLogoBytesAsync();
            try
            {
                var logo = await _fileService.GetAsync("Assets/logo.jpeg");
                if (logo.HasValue) logoBytes = logo.Value.fileBytes;
            }
            catch { }


            byte[]? photoBytes = null;
            try
            {
                var photoRecord = await _photoService.GetByApplicationIdAsync(applicationId);
                if (photoRecord?.PhotoUrl != null)
                {
                    var pf = await _fileService.GetAsync(photoRecord.PhotoUrl);
                    if (pf.HasValue) photoBytes = pf.Value.fileBytes;
                }
            }
            catch { }


            var degreeMap = (await _degreeService.GetAllAsync())
                .ToDictionary(x => x.Id, x => x.DegreeName ?? x.Id.ToString());
            var courseMap = (await _courseService.GetAllAsync())
                .ToDictionary(x => x.Id, x => x.Name ?? x.Id.ToString());

            degreeMap.TryGetValue(examApp.DegreeId, out var degreeName);
            courseMap.TryGetValue(examApp.CourseId, out var courseName);


            string registrationNumber =
                !string.IsNullOrWhiteSpace(examApp.RegisNumber)
                    ? examApp.RegisNumber
                    : appNo;

            var lookupMap = (await _lookupService.GetAllAsync())
                .ToDictionary(x => x.Id, x => x.Name ?? x.Code ?? x.Id.ToString());

            string semesterName = lookupMap.TryGetValue(examApp.SemId, out var sn)
                ? sn : "IV Semester";

            string academicYear = await ResolveAcademicYearNameAsync(
                examApp.AcademicYearId.ToString());

            string examinationTitle = !string.IsNullOrWhiteSpace(academicYear)
                ? $"UG Examination – {academicYear}"
                : "UG Examination, March/April - 2026";


            var subjects = examDetails
                .Select(d => new HallTicketSubjectRow
                {
                    ExamDate = "",
                    Day = "",
                    Time = "10:00 AM – 01:00 PM",
                    PaperCode = d.SubjectId.ToString()[..8],
                    PaperTitle = d.SubjectId.ToString(),
                })
                .ToList();


            var data = new HallTicketData
            {
                RegistrationNumber = registrationNumber,
                CandidateName = examApp.Name,
                Semester = semesterName,
                Examination = examinationTitle,
                AcademicYear = academicYear,
                Venue = "School Building – I, Grama Gangothri Campus\n" +
                                     "MGRDPR University, Nagavi, Gadag – 582103",
                DegreeName = degreeName ?? "",
                CourseName = courseName ?? "",
                LogoBytes = logoBytes,
                PhotoBytes = photoBytes,
                Subjects = subjects,
            };


            var pdfBytes = new HallTicketReport(data).GeneratePdf();
            string fileName =
                $"HallTicket_{registrationNumber}_{DateTime.Now:yyyyMMddHHmmss}.pdf";

            return download
                ? File(pdfBytes, "application/pdf", fileName)
                : File(pdfBytes, "application/pdf");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error generating hall ticket",
                error = ex.Message
            });
        }
    }
    [HttpGet("hall-ticket-bulk")]
    public async Task<IActionResult> GenerateHallTicketBulk(
        [FromQuery] Guid academicYearId,
        [FromQuery] Guid semId,
        [FromQuery] Guid? degreeId = null,
        [FromQuery] Guid? courseId = null,
        [FromQuery] bool download = false)
    {
        try
        {

            var approvedApps = await _examApplicationService.GetApprovedAsync(
                academicYearId, semId, degreeId, courseId);

            if (!approvedApps.Any())
                return NotFound(new { message = "No approved exam applications found." });


            byte[]? logoBytes = await _fileService.GetLogoBytesAsync();
            try { logoBytes = await _fileService.GetLogoBytesAsync(); } catch { }

            var degreeMap = (await _degreeService.GetAllAsync())
                .ToDictionary(x => x.Id, x => x.DegreeName ?? x.Id.ToString());
            var courseMap = (await _courseService.GetAllAsync())
                .ToDictionary(x => x.Id, x => x.Name ?? x.Id.ToString());
            var lookupMap = (await _lookupService.GetAllAsync())
                .ToDictionary(x => x.Id, x => x.Name ?? x.Code ?? x.Id.ToString());

            string academicYear = await ResolveAcademicYearNameAsync(
                academicYearId.ToString());
            string examinationTitle = !string.IsNullOrWhiteSpace(academicYear)
                ? $"UG Examination – {academicYear}"
                : "UG Examination, March/April - 2026";

            var allAdmissionApps = await _queryService.FilterAsync(
                new ApplicationFilterDto
                {
                    DegreeId = degreeId,
                    CourseId = courseId,
                });

            var admissionByAppNo = allAdmissionApps
                .Where(a => a.Application != null)
                .ToDictionary(
                    a =>
                    {
                        try { return a.Application!.AppNo?.ToString() ?? ""; }
                        catch { return ""; }
                    },
                    a => a,
                    StringComparer.OrdinalIgnoreCase);


            var allSubjects = await _subjectService.GetAllAsync();
            var subjectMap = allSubjects
                .ToDictionary(x => x.Id, x => new { x.Name, x.Code });

            var allCourseSubjects = await _courseSubjectService.GetAllAsync();


            var targetDegreeId = degreeId ?? approvedApps.First().DegreeId;
            var targetCourseId = courseId ?? approvedApps.First().CourseId;

            var sharedSubjects = allCourseSubjects
                .Where(cs =>
                    cs.DegreeId == targetDegreeId &&
                    cs.CourseId == targetCourseId &&
                    cs.SemId == semId)
                .Select(cs =>
                {
                    subjectMap.TryGetValue(cs.SubjectId, out var sub);
                    return new HallTicketSubjectRow
                    {
                        ExamDate = "",
                        Day = "",
                        Time = "10:00 AM – 01:00 PM",
                        PaperCode = sub?.Code ?? "—",
                        PaperTitle = sub?.Name ?? "—",
                    };
                })
                .ToList();

            if (!sharedSubjects.Any())
                return NotFound(new
                {
                    message = "No subjects found for this degree/course/semester combination."
                });


            var ticketDataList = new List<HallTicketData>();

            foreach (var examApp in approvedApps)
            {

                byte[]? photoBytes = null;
                try
                {

                    admissionByAppNo.TryGetValue(
                        examApp.RegisNumber ?? "", out var matchedApp);

                    if (matchedApp?.Application != null)
                    {
                        var admissionId = (Guid)matchedApp.Application.Id;
                        var photoRecord = await _photoService
                            .GetByApplicationIdAsync(admissionId);

                        if (photoRecord?.PhotoUrl != null)
                        {
                            var pf = await _fileService
                                .GetAsync(photoRecord.PhotoUrl);
                            if (pf.HasValue) photoBytes = pf.Value.fileBytes;
                        }
                    }
                }
                catch { }

                degreeMap.TryGetValue(examApp.DegreeId, out var dName);
                courseMap.TryGetValue(examApp.CourseId, out var cName);

                string registrationNumber =
                    !string.IsNullOrWhiteSpace(examApp.RegisNumber)
                        ? examApp.RegisNumber
                        : examApp.ApplicationNo;

                string semesterName = lookupMap.TryGetValue(
                    examApp.SemId, out var sn) ? sn : "Semester";

                ticketDataList.Add(new HallTicketData
                {
                    RegistrationNumber = registrationNumber,
                    CandidateName = examApp.Name,
                    Semester = semesterName,
                    Examination = examinationTitle,
                    AcademicYear = academicYear,
                    Venue = "School Building – I, Grama Gangothri Campus\n" +
                                         "MGRDPR University, Nagavi, Gadag – 582103",
                    DegreeName = dName ?? "",
                    CourseName = cName ?? "",
                    LogoBytes = logoBytes,
                    PhotoBytes = photoBytes,
                    Subjects = sharedSubjects,
                });
            }

            if (!ticketDataList.Any())
                return NotFound(new { message = "No hall tickets could be generated." });


            var mergedPdf = QuestPDF.Fluent.Document
                .Merge(ticketDataList.Select(d => new HallTicketReport(d)))
                .GeneratePdf();


            string targetDegreeName = degreeMap.TryGetValue(targetDegreeId, out var tdn) ? tdn : "Degree";
            string targetCourseName = courseMap.TryGetValue(targetCourseId, out var tcn) ? tcn : "Course";

            string safeDegreeName = targetDegreeName.Replace(" ", "").Replace("/", "-");
            string safeCourseName = targetCourseName.Replace(" ", "").Replace("/", "-");


            string fileName =
                $"HallTicket_{safeDegreeName}_{safeCourseName}.pdf";

            return download
                ? File(mergedPdf, "application/pdf", fileName)
                : File(mergedPdf, "application/pdf");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error generating bulk hall tickets",
                error = ex.Message
            });
        }
    }
}