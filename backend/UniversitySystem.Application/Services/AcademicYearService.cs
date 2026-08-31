using KVFSU.Application.Interfaces.Common;

public class AcademicYearService : IAcademicYearService
{
    private readonly IAcademicYearRepository _repo;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public AcademicYearService(
        IAcademicYearRepository repo,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repo = repo;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    // ✅ CREATE
    public async Task<AcademicYear> CreateAsync(CreateAcademicYearDto dto)
    {
        var entity = new AcademicYear
        {
            Id = Guid.NewGuid(),
            Description = dto.Description,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            InsertBy = _currentUser.Username,
            InsertOn = DateTime.UtcNow,
            Status = true,
            BatchYear = dto.BatchYear
        };

        var result = await _repo.CreateAsync(entity);

        await _auditLog.LogAsync("academic_years", result.Id, "INSERT", null, new
        {
            result.Description,
            result.BatchYear,
            result.StartDate,
            result.EndDate,
            result.InsertBy
        });

        return result;
    }

    // ✅ GET ALL
    public async Task<List<AcademicYear>> GetAllAsync()
    {
        return await _repo.GetAllAsync();
    }

    // ✅ GET BY ID
    public async Task<AcademicYear?> GetByIdAsync(Guid id)
    {
        return await _repo.GetByIdAsync(id);
    }

    // ✅ UPDATE
    public async Task<bool> UpdateAsync(UpdateAcademicYearDto dto)
    {
        var entity = await _repo.GetByIdAsync(dto.Id);

        if (entity == null)
            return false;

        var old = new { entity.Description, entity.StartDate, entity.EndDate };

        entity.Description = dto.Description;
        entity.BatchYear = dto.BatchYear;
        entity.StartDate = dto.StartDate;
        entity.EndDate = dto.EndDate;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("academic_years", entity.Id, "UPDATE", old, new
        {
            entity.Description,
            entity.BatchYear,
            entity.StartDate,
            entity.EndDate,
            entity.UpdateBy
        });

        return true;
    }

    // ✅ SOFT DELETE
    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await _repo.GetByIdAsync(id);

        if (entity == null)
            return false;

        var old = new { entity.Description, entity.Status, entity.BatchYear };

        entity.Status = false;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("academic_years", entity.Id, "DELETE", old, null);

        return true;
    }
}
