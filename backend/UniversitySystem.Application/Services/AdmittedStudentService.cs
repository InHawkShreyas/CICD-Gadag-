public class AdmittedStudentService : IAdmittedStudentService
{
    private readonly IAdmittedStudentRepository _repo;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public AdmittedStudentService(
        IAdmittedStudentRepository repo,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repo = repo;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    // 🔁 MAP
    private AdmittedStudentResponseDto Map(AdmittedStudent x)
    {
        return new AdmittedStudentResponseDto
        {
            Id = x.Id,
            ApplicationId = x.ApplicationId,
            ApplicationNo = x.ApplicationNo,
            Name = x.Name,
            AdmitYn = x.AdmitYn,
            Remarks = x.Remarks
        };
    }

    // ✅ CREATE (ADMIT)
    public async Task<AdmittedStudentResponseDto> CreateAsync(CreateAdmittedStudentDto dto)
    {
        // 🔒 VALIDATION
        if (dto.ApplicationId == Guid.Empty)
            throw new ArgumentException("ApplicationId is required");

        if (string.IsNullOrWhiteSpace(dto.ApplicationNo))
            throw new ArgumentException("Application number is required");

        // 🔥 prevent duplicate
        if (await _repo.ExistsByApplicationIdAsync(dto.ApplicationId))
            throw new InvalidOperationException("Student already admitted");

        var entity = new AdmittedStudent
        {
            Id = Guid.NewGuid(),
            ApplicationId = dto.ApplicationId,
            ApplicationNo = dto.ApplicationNo.Trim(),
            Name = string.IsNullOrWhiteSpace(dto.Name) ? null : dto.Name.Trim(),
            Remarks = dto.Remarks,

            // ✅ BUSINESS RULE: create = admitted
            AdmitYn = true,

            InsertBy = _currentUser.Username,
            InsertOn = DateTime.UtcNow
        };

        var result = await _repo.CreateAsync(entity);

        // 🔥 AUDIT
        await _auditLog.LogAsync("admitted_students", result.Id, "INSERT", null, new
        {
            result.ApplicationId,
            result.ApplicationNo,
            result.Name,
            result.AdmitYn,
            result.Remarks,
            result.InsertBy
        });

        return Map(result);
    }

    // ✅ GET ALL
    public async Task<List<AdmittedStudentResponseDto>> GetAllAsync()
    {
        var list = await _repo.GetAllAsync();
        return list.Select(Map).ToList();
    }

    // ✅ GET BY APPLICATION
    public async Task<AdmittedStudentResponseDto?> GetByApplicationIdAsync(Guid applicationId)
    {
        if (applicationId == Guid.Empty)
            return null;

        var data = await _repo.GetByApplicationIdAsync(applicationId);
        return data == null ? null : Map(data);
    }

    // ✅ UPDATE
    public async Task<bool> UpdateAsync(UpdateAdmittedStudentDto dto)
    {
        if (dto.Id == Guid.Empty)
            return false;

        var entity = await _repo.GetByIdAsync(dto.Id);
        if (entity == null) return false;

        var old = new
        {
            entity.AdmitYn,
            entity.Remarks
        };

        entity.AdmitYn = dto.AdmitYn;
        entity.Remarks = dto.Remarks;

        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        // 🔥 AUDIT
        await _auditLog.LogAsync("admitted_students", entity.Id, "UPDATE", old, new
        {
            entity.AdmitYn,
            entity.Remarks,
            entity.UpdateBy
        });

        return true;
    }
}