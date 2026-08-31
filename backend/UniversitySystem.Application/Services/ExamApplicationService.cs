using KVFSU.Application.Interfaces.Common;

public class ExamApplicationService
    : IExamApplicationService
{
    private readonly IExamApplicationRepository _applicationRepo;
    private readonly IExamApplicationDetailRepository _detailRepo;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public ExamApplicationService(
        IExamApplicationRepository applicationRepo,
        IExamApplicationDetailRepository detailRepo,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _applicationRepo = applicationRepo;
        _detailRepo = detailRepo;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    public async Task<Guid> CreateAsync(
        CreateExamApplicationDto dto)
    {
        var username =
            _currentUser.Username ?? "system";

        var lastApplication =
            await _applicationRepo
                .GetLastApplicationAsync();

        int nextNumber = 1;

        if (
            lastApplication != null &&
            !string.IsNullOrWhiteSpace(
                lastApplication.ApplicationNo))
        {
            var parts =
                lastApplication.ApplicationNo.Split('-');

            if (
                parts.Length >= 3 &&
                int.TryParse(
                    parts[2],
                    out var lastNo))
            {
                nextNumber = lastNo + 1;
            }
        }

        var applicationNo =
            $"EX-{dto.SemesterNumber}SEM-{nextNumber:D6}";

        var application = new ExamApplication
        {
            Id = Guid.NewGuid(),

            ApplicationNo = applicationNo,

            Name = dto.Name,

            RegisNumber = dto.RegisNumber,

            DegreeId = dto.DegreeId,

            CourseId = dto.CourseId,

            SemId = dto.SemId,

            AcademicYearId = dto.AcademicYearId,

            Mobile = dto.Mobile,

            Email = dto.Email,

            AcademicApproval = false,

            AttendanceApproval = false,

            OtherApproval = false,

            InsertBy = username,

            InsertOn = DateTime.UtcNow,

            Status = true,
            
            DeclarationYn = dto.DeclarationYn,
        };

        await _applicationRepo
            .CreateAsync(application);

        var details = dto.SubjectIds
            .Select(subjectId =>
                new ExamApplicationDetail
                {
                    Id = Guid.NewGuid(),

                    ExamApplicationId =
                        application.Id,

                    SubjectId = subjectId,

                    InsertBy = username,

                    InsertOn = DateTime.UtcNow,

                    Status = true
                })
            .ToList();

        await _detailRepo
            .CreateRangeAsync(details);

        await _auditLog.LogAsync(
            "exam_application",
            application.Id,
            "INSERT",
            null,
            new
            {
                application.ApplicationNo,
                application.Name,
                application.RegisNumber
            });

        return application.Id;
    }

    public async Task<List<ExamApplication>>
        GetAllAsync()
    {
        return await _applicationRepo
            .GetAllAsync();
    }

    public async Task<ExamApplication?>
        GetByIdAsync(Guid id)
    {
        return await _applicationRepo
            .GetByIdAsync(id);
    }

    public async Task<List<ExamApplicationDetailDto>>
        GetDetailsByApplicationIdAsync(Guid applicationId)
    {
        var details = await _detailRepo
            .GetByApplicationIdAsync(applicationId);

        return details.Select(d => new ExamApplicationDetailDto
        {
            Id = d.Id,
            ExamApplicationId = d.ExamApplicationId,
            SubjectId = d.SubjectId,
            AttendancePercentage = d.AttendancePercentage,
            IaMarks = d.IaMarks
        }).ToList();
    }

    public async Task AcademicApproveAsync(
        Guid applicationId,
        AcademicApproveDto dto)
    {
        var username = _currentUser.Username ?? "system";

        var application = await _applicationRepo
            .GetByIdAsync(applicationId)
            ?? throw new Exception("Application not found.");

        var details = await _detailRepo
            .GetByApplicationIdAsync(applicationId);

        foreach (var mark in dto.SubjectMarks)
        {
            var detail = details.FirstOrDefault(
                d => d.SubjectId == mark.SubjectId);

            if (detail == null) continue;

            detail.IaMarks = mark.IaMarks;
            detail.AttendancePercentage = mark.AttendancePercentage;
            detail.UpdateBy = username;
            detail.UpdateOn = DateTime.UtcNow;

            await _detailRepo.UpdateAsync(detail);
        }

        application.AcademicApproval = true;
        application.UpdateBy = username;
        application.UpdateOn = DateTime.UtcNow;

        await _applicationRepo.UpdateAsync(application);

        await _auditLog.LogAsync(
            "exam_application",
            application.Id,
            "ACADEMIC_APPROVE",
            null,
            new { application.ApplicationNo });
    }

    public async Task FinalApproveAsync(
        Guid applicationId,
        FinalApproveDto dto)
    {
        var username = _currentUser.Username ?? "system";

        var application = await _applicationRepo
            .GetByIdAsync(applicationId)
            ?? throw new Exception("Application not found.");

        application.AttendanceApproval = dto.AttendanceApproval;
        application.OtherApproval = dto.OtherApproval;
        application.UpdateBy = username;
        application.UpdateOn = DateTime.UtcNow;

        await _applicationRepo.UpdateAsync(application);

        await _auditLog.LogAsync(
            "exam_application",
            application.Id,
            "FINAL_APPROVE",
            null,
            new
            {
                application.ApplicationNo,
                dto.AttendanceApproval,
                dto.OtherApproval
            });
    }

    public async Task<List<ExamApplication>> GetApprovedAsync(
    Guid  academicYearId,
    Guid  semId,
    Guid? degreeId  = null,
    Guid? courseId  = null)
{
    var all = await _applicationRepo.GetAllAsync();
 
    return all
        .Where(a =>
            a.Status                == true  &&
            a.AcademicApproval      == true  &&
            a.AttendanceApproval    == true  &&
            a.AcademicYearId        == academicYearId &&
            a.SemId                 == semId &&
            (degreeId == null || a.DegreeId == degreeId) &&
            (courseId == null || a.CourseId == courseId))
        .OrderBy(a => a.Name)
        .ToList();
}
}