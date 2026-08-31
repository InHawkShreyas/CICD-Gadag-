public class ApplicationVerificationService : IApplicationVerificationService
{
    private readonly IApplicationVerificationRepository _repo;
    private readonly IAuditLogService _auditLog;
    private readonly ICurrentUserService _currentUser;

    public ApplicationVerificationService(
        IApplicationVerificationRepository repo,
        IAuditLogService auditLog,
        ICurrentUserService currentUser)
    {
        _repo = repo;
        _auditLog = auditLog;
        _currentUser = currentUser;
    }

    // ✅ CREATE
    public async Task<ApplicationVerificationResponseDto> CreateAsync(CreateApplicationVerificationDto dto)
    {
        var entity = new ApplicationVerification
        {
            Id = Guid.NewGuid(),
            ApplicationId = dto.ApplicationId,
            AppNo = dto.AppNo,
            VerificationStatus = dto.VerificationStatus,
            Remark = dto.Remark,
            Installment = dto.Installment,
            FeesEnabled = dto.FeesEnabled,
            PostPaymentEdit = dto.PostPaymentEdit,

            Status = true,
            InsertBy = _currentUser.Username,
            InsertOn = DateTime.UtcNow
        };

        var result = await _repo.CreateAsync(entity);

        await _auditLog.LogAsync("application_verification", result.Id, "INSERT", null, new
        {
            result.ApplicationId,
            result.AppNo,
            result.VerificationStatus,
            result.Remark,
            result.Installment,
            result.InsertBy
        });

        return Map(result);
    }

    // ✅ UPDATE
    public async Task<bool> UpdateAsync(UpdateApplicationVerificationDto dto)
    {
        var entity = await _repo.GetByIdAsync(dto.Id);
        if (entity == null) return false;

        var old = new
        {
            entity.VerificationStatus,
            entity.Remark,
            entity.Installment
        };

        entity.VerificationStatus = dto.VerificationStatus;
        entity.Remark = dto.Remark;
        entity.Installment = dto.Installment;
        entity.FeesEnabled = dto.FeesEnabled;
        entity.PostPaymentEdit = dto.PostPaymentEdit;

        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("application_verification", entity.Id, "UPDATE", old, new
        {
            entity.VerificationStatus,
            entity.Remark,
            entity.Installment,
            entity.UpdateBy
        });

        return true;
    }

    // ✅ GET ALL
    public async Task<List<ApplicationVerificationResponseDto>> GetAllAsync()
    {
        var list = await _repo.GetAllAsync();
        return list.Select(Map).ToList();
    }

    // ✅ GET BY ID
    public async Task<ApplicationVerificationResponseDto?> GetByIdAsync(Guid id)
    {
        var data = await _repo.GetByIdAsync(id);
        return data == null ? null : Map(data);
    }

    // ✅ GET BY APP NO
    public async Task<ApplicationVerificationResponseDto?> GetByAppNoAsync(string appNo)
    {
        var data = await _repo.GetByAppNoAsync(appNo);
        return data == null ? null : Map(data);
    }

    // ✅ DELETE (SOFT)
    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await _repo.GetByIdAsync(id);
        if (entity == null) return false;

        var old = new
        {
            entity.Status
        };

        entity.Status = false;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("application_verification", entity.Id, "DELETE", old, null);

        return true;
    }

    // 🔁 MAP

    private ApplicationVerificationResponseDto Map(ApplicationVerification x)
    {
        return new ApplicationVerificationResponseDto
        {
            Id = x.Id,
            ApplicationId = x.ApplicationId,
            AppNo = x.AppNo,
            VerificationStatus = x.VerificationStatus,
            Remark = x.Remark,
            Installment = x.Installment,
            FeesEnabled = x.FeesEnabled,
            PostPaymentEdit = x.PostPaymentEdit,
            InsertBy = x.InsertBy,
            UpdateBy = x.UpdateBy
        };
    }
}