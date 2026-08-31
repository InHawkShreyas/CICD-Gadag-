public class EducationDetailService : IEducationDetailService
{
    private readonly IEducationDetailRepository _repo;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public EducationDetailService(
        IEducationDetailRepository repo,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repo = repo;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    // ✅ CREATE
    public async Task<EducationDetail> CreateAsync(CreateEducationDetailDto dto)
    {
        decimal? percentage = dto.Percentage;

        // 🔥 Auto-calculate percentage if not provided
        if (!percentage.HasValue && dto.MaxMarks.HasValue && dto.ObtainedMarks.HasValue && dto.MaxMarks != 0)
        {
            percentage = (dto.ObtainedMarks.Value / dto.MaxMarks.Value) * 100;
        }

        var entity = new EducationDetail
        {
            Id = Guid.NewGuid(),
            ApplicationId = dto.ApplicationId,
            AppNo = dto.AppNo,
            ExamName = dto.ExamName,
            MaxMarks = dto.MaxMarks,
            ObtainedMarks = dto.ObtainedMarks,
            RegistrationNumber = dto.RegistrationNumber,
            Percentage = percentage,
            CGPA = dto.CGPA,
            year = dto.year,
            InsertBy = _currentUser.Username,
            Status = true
        };

        var result = await _repo.CreateAsync(entity);

        // 🔥 AUDIT
        await _auditLog.LogAsync("education_details", result.Id, "INSERT", null, new
        {
            result.ApplicationId,
            result.ExamName,
            result.MaxMarks,
            result.ObtainedMarks,
            result.Percentage
        });

        return result;
    }

    // ✅ GET ALL
    public async Task<List<EducationDetail>> GetAllAsync()
    {
        return await _repo.GetAllAsync();
    }

    // ✅ GET BY APPLICATION
    public async Task<List<EducationDetail>> GetByApplicationIdAsync(Guid applicationId)
    {
        return await _repo.GetByApplicationIdAsync(applicationId);
    }

    // ✅ GET BY ID
    public async Task<EducationDetail?> GetByIdAsync(Guid id)
    {
        return await _repo.GetByIdAsync(id);
    }

    // ✅ UPDATE
    public async Task<bool> UpdateAsync(UpdateEducationDetailDto dto)
    {
        var entity = await _repo.GetByIdAsync(dto.Id);

        if (entity == null)
            return false;

        var old = new
        {
            entity.AppNo,
            entity.ExamName,
            entity.MaxMarks,
            entity.ObtainedMarks,
            entity.Percentage
        };

        decimal? percentage = dto.Percentage;

        if (!percentage.HasValue && dto.MaxMarks.HasValue && dto.ObtainedMarks.HasValue && dto.MaxMarks != 0)
        {
            percentage = (dto.ObtainedMarks.Value / dto.MaxMarks.Value) * 100;
        }

        entity.AppNo = dto.AppNo;
        entity.ExamName = dto.ExamName;
        entity.MaxMarks = dto.MaxMarks;
        entity.ObtainedMarks = dto.ObtainedMarks;
        entity.RegistrationNumber = dto.RegistrationNumber;
        entity.Percentage = percentage;
        entity.CGPA = dto.CGPA;
        entity.year = dto.year;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("education_details", entity.Id, "UPDATE", old, new
        {
            entity.AppNo,
            entity.ExamName,
            entity.MaxMarks,
            entity.ObtainedMarks,
            entity.Percentage
        });

        return true;
    }

    // ✅ DELETE (SOFT)
    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await _repo.GetByIdAsync(id);

        if (entity == null)
            return false;

        var old = new { entity.ExamName, entity.Status };

        entity.Status = false;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("education_details", entity.Id, "DELETE", old, null);

        return true;
    }
}