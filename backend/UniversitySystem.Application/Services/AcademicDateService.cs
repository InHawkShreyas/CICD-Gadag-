public class AcademicDateService : IAcademicDateService
{
    private readonly IAcademicDateRepository _repo;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public AcademicDateService(
        IAcademicDateRepository repo,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repo = repo;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    // ✅ CREATE
    public async Task<AcademicDate> CreateAsync(CreateAcademicDateDto dto)
    {
        var entity = new AcademicDate
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            InsertBy = _currentUser.Username,
            InsertOn = DateTime.UtcNow,
            Status = true
        };

        var result = await _repo.CreateAsync(entity);

        await _auditLog.LogAsync("academic_dates", result.Id, "INSERT", null, new
        {
            result.Name,
            result.Description,
            result.StartDate,
            result.EndDate,
            result.InsertBy
        });

        return result;
    }

    // ✅ GET ALL
    public async Task<List<AcademicDate>> GetAllAsync()
    {
        return await _repo.GetAllAsync();
    }

    // ✅ GET BY ID
    public async Task<AcademicDate?> GetByIdAsync(Guid id)
    {
        return await _repo.GetByIdAsync(id);
    }

    // ✅ UPDATE
    public async Task<bool> UpdateAsync(UpdateAcademicDateDto dto)
    {
        var entity = await _repo.GetByIdAsync(dto.Id);

        if (entity == null)
            return false;

        var old = new { entity.Name, entity.Description, entity.StartDate, entity.EndDate };

        entity.Name = dto.Name;
        entity.Description = dto.Description;
        entity.StartDate = dto.StartDate;
        entity.EndDate = dto.EndDate;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("academic_dates", entity.Id, "UPDATE", old, new
        {
            entity.Name,
            entity.Description,
            entity.StartDate,
            entity.EndDate,
            entity.UpdateBy
        });

        return true;
    }

    // ✅ DELETE (SOFT)
    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await _repo.GetByIdAsync(id);

        if (entity == null)
            return false;

        var old = new { entity.Name, entity.Status };

        entity.Status = false;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("academic_dates", entity.Id, "DELETE", old, null);

        return true;
    }
}
