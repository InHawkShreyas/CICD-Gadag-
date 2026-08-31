using UniversitySystem.Application.Dtos.Application;
using UniversitySystem.Application.DTOs.FeeCollectionManualDtos;

public class ApplicationQueryService : IApplicationQueryService
{
    private readonly IApplicationRepository _appRepo;
    private readonly IEducationDetailRepository _eduRepo;
    private readonly IApplicationCourseDetailRepository _courseRepo;
    private readonly ISeatTypeRepository _seatRepo;

    private readonly IApplicationDocumentService _documentService;
    private readonly IFeeCollectionService _feeCollectionService;
    private readonly IFeeCollectionManualService _manualFeeService;
    private readonly IApplicationVerificationService _verificationService;

    public ApplicationQueryService(
        IApplicationRepository appRepo,
        IEducationDetailRepository eduRepo,
        IApplicationCourseDetailRepository courseRepo,
        ISeatTypeRepository seatRepo,

        IApplicationDocumentService documentService,
        IFeeCollectionService feeCollectionService,
        IFeeCollectionManualService manualFeeService,
        IApplicationVerificationService verificationService
    )
    {
        _appRepo = appRepo;

        _eduRepo = eduRepo;

        _courseRepo = courseRepo;

        _seatRepo = seatRepo;

        _documentService = documentService;

        _feeCollectionService = feeCollectionService;

        _manualFeeService = manualFeeService;

        _verificationService = verificationService;
    }
    // =====================================================
    // ✅ MY APPLICATION
    // =====================================================

    public async Task<ApplicationFullResponseDto?>
        GetMyApplicationAsync(string username)
    {
        var app = await _appRepo
            .GetLatestByUsernameAsync(username);

        if (app == null)
            return null;

        return await BuildResponse(app);
    }

    // =====================================================
    // ✅ GET BY APP NO
    // =====================================================

    public async Task<ApplicationFullResponseDto?>
        GetByAppNoAsync(string appNo)
    {
        var app = await _appRepo
            .GetByAppNoAsync(appNo);

        if (app == null)
            return null;

        return await BuildResponse(app);
    }

    // =====================================================
    // ✅ COMMON RESPONSE BUILDER
    // =====================================================

    private async Task<ApplicationFullResponseDto>
        BuildResponse(Applications app)
    {
        // =================================================
        // BASIC DATA
        // =================================================

        var education =
            await _eduRepo
                .GetByApplicationIdAsync(app.Id);

        var courses =
            await _courseRepo
                .GetByApplicationIdAsync(app.Id);

        var seats =
            await _seatRepo
                .GetByApplicationIdAsync(app.Id);

        // =================================================
        // DOCUMENTS
        // =================================================

        var documents =
            await _documentService
                .GetByApplicationIdAsync(app.Id);

        // =================================================
        // ONLINE PAYMENTS
        // =================================================

        var feePayments =
            await _feeCollectionService
                .GetByApplicationIdAsync(app.Id);

        feePayments = feePayments
            .Where(x =>
                (x.Status ?? "")
                    .ToUpper() == "SUCCESS"
            )
            .ToList();

        // =================================================
        // MANUAL PAYMENTS — always fetch, no fallback gate
        // =================================================

        var manualPayments =
            await _manualFeeService
                .GetByAppNoAsync(app.AppNo);

        // =================================================
        // VERIFICATION
        // =================================================

        var verification =
            await _verificationService
                .GetByAppNoAsync(app.AppNo);

        // =================================================
        // RESPONSE
        // =================================================

        return new ApplicationFullResponseDto
        {
            Application = app,

            EducationDetails = education,

            CourseDetails = courses,

            SeatTypes = seats,

            Documents = documents,

            FeePayments = feePayments,

            ManualFeePayments = manualPayments,

            Verification = verification
        };
    }

    // =====================================================
    // ✅ FILTER — single query, no per-application N+1
    // =====================================================

    public async Task<List<ApplicationFullResponseDto>> FilterAsync(ApplicationFilterDto filter)
    {
        var apps = await _appRepo.GetAllWithDetailsAsync();

        IEnumerable<Applications> filtered = apps;

        if (filter.CategoryId.HasValue)
            filtered = filtered.Where(x => x.CategoryId == filter.CategoryId);

        if (filter.AcademicYearId.HasValue)
            filtered = filtered.Where(x => x.AcademicYearId == filter.AcademicYearId);

        if (filter.DegreeId.HasValue)
            filtered = filtered.Where(x =>
                x.CourseDetails != null &&
                x.CourseDetails.Any(c => c.DegreeId == filter.DegreeId));

        if (filter.CourseId.HasValue)
            filtered = filtered.Where(x =>
                x.CourseDetails != null &&
                x.CourseDetails.Any(c => c.CourseId == filter.CourseId));

        if (filter.SeatTypeId.HasValue)
            filtered = filtered.Where(x =>
                x.SeatTypes != null &&
                x.SeatTypes.Any(s => s.SeatTypeId == filter.SeatTypeId));

        return filtered.Select(app => new ApplicationFullResponseDto
        {
            Application = app,
            EducationDetails = app.EducationDetails?.ToList() ?? new(),
            CourseDetails = app.CourseDetails?.ToList() ?? new(),
            SeatTypes = app.SeatTypes?.ToList() ?? new(),
        }).ToList();
    }
    public async Task<List<ApplicationFullResponseDto>> GetAllAsync()
    {
        // Single DB query — joins all 5 child tables via EF Include + AsSplitQuery
        var apps = await _appRepo.GetAllWithDetailsAsync();

        // Fees still fetched in bulk (no repo access here for fee tables)
        var allFees = await _feeCollectionService.GetAllAsync();
        var allManualFees = await _manualFeeService.GetAllAsync();

        var feesByApp = allFees.GroupBy(x => x.ApplicationId).ToDictionary(g => g.Key, g => g.ToList());
        var manualByAppNo = allManualFees.GroupBy(x => x.AppNo ?? "").ToDictionary(g => g.Key, g => g.ToList());

        return apps.Select(app => new ApplicationFullResponseDto
        {
            Application = app,
            EducationDetails = app.EducationDetails?.ToList() ?? new(),
            CourseDetails = app.CourseDetails?.ToList() ?? new(),
            SeatTypes = app.SeatTypes?.ToList() ?? new(),
            Documents = app.Documents?.Select(x => new ApplicationDocumentResponseDto
            {
                Id = x.Id,
                ApplicationId = x.ApplicationId,
                ApplicationNo = x.ApplicationNo,
                DocumentName = x.DocumentName,
                FileName = x.FileName,
                FileUrl = x.FileUrl
            }).ToList() ?? new List<ApplicationDocumentResponseDto>(),
            FeePayments = (feesByApp.GetValueOrDefault(app.Id) ?? new())
                                   .Where(x => (x.Status ?? "").ToUpper() == "SUCCESS")
                                   .ToList(),
            ManualFeePayments = manualByAppNo.GetValueOrDefault(app.AppNo ?? "") ?? new(),
            Verification = app.Verification == null ? null : new ApplicationVerificationResponseDto
            {
                Id = app.Verification.Id,
                ApplicationId = app.Verification.ApplicationId,
                AppNo = app.Verification.AppNo,
                VerificationStatus = app.Verification.VerificationStatus,
                Remark = app.Verification.Remark,
                Installment = app.Verification.Installment,
                InsertBy = app.Verification.InsertBy,
                UpdateBy = app.Verification.UpdateBy
            }
        }).ToList();
    }

    public async Task<List<DocumentVerificationDto>> GetAllForDocumentVerificationAsync()
    {
        var apps = await _appRepo.GetAllForDocumentVerificationAsync();

        var allFees = await _feeCollectionService.GetAllAsync();
        var successfulFeesByApp = allFees
            .Where(x => (x.Status ?? "").ToUpper() == "SUCCESS")
            .GroupBy(x => x.ApplicationId)
            .ToDictionary(g => g.Key, g => g.ToList());

        // NEW — manual admission-fee payments, mirrors the online+manual check
        // useAdmissionLock.ts already does on the student side.
        var allManualFees = await _manualFeeService.GetAllAsync();
        var manualFeesByAppNo = allManualFees
            .GroupBy(x => x.AppNo ?? "")
            .ToDictionary(g => g.Key, g => g.ToList());

        return apps.Select(app =>
        {
            var cd = app.CourseDetails?
                .Where(c => c.Status == true)
                .OrderBy(c => c.InsertOn)
                .FirstOrDefault();

            var preferenceCount = app.CourseDetails?.Count(c => c.Status == true) ?? 0;

            var hasSuccessfulAppFeePayment =
                successfulFeesByApp.TryGetValue(app.Id, out var appFees) &&
                appFees.Any(f => (f.FeeType ?? "").ToLower().Contains("application fee"));

            // NEW — admission fee, online or manual
            var hasSuccessfulAdmissionFeePayment =
                successfulFeesByApp.TryGetValue(app.Id, out var admissionFees) &&
                admissionFees.Any(f => (f.FeeType ?? "").ToLower().Contains("admission fee"));

            var hasManualAdmissionFeePayment =
                manualFeesByAppNo.TryGetValue(app.AppNo ?? "", out var manualFees) &&
                manualFees.Any(f => (f.FeeName ?? "").ToLower().Contains("admission fee"));

            return new DocumentVerificationDto
            {
                Id = app.Id,
                AppNo = app.AppNo!,
                Name = app.Name,
                Email = app.Email,
                Phone = app.Phone,
                PermanentAddress = app.PermanentAddress,
                CategoryId = app.CategoryId,
                AcademicYearId = app.AcademicYearId,

                DegreeId = cd?.DegreeId,
                CourseId = cd?.CourseId,
                BatchId = cd?.BatchId,
                PreviousRegistrationNo = cd?.PreviousRegistrationNo,

                VerificationId = app.Verification?.Id,
                VerificationStatus = app.Verification?.VerificationStatus,
                VerificationRemark = app.Verification?.Remark,
                Installment = app.Verification?.Installment,
                FeesEnabled = app.Verification?.FeesEnabled,
                PostPaymentEdit = app.Verification?.PostPaymentEdit,          // NEW
                VerificationInsertBy = app.Verification?.InsertBy,
                VerificationUpdateBy = app.Verification?.UpdateBy,

                PreferenceCount = preferenceCount == 0 ? 1 : preferenceCount,
                IsAppFeePaid = !string.IsNullOrWhiteSpace(cd?.PreviousRegistrationNo) || hasSuccessfulAppFeePayment,
                IsAdmissionFeePaid = hasSuccessfulAdmissionFeePayment || hasManualAdmissionFeePayment,   // NEW
            };
        }).ToList();
    }
}