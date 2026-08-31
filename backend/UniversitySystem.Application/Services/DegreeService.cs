public class DegreeService : IDegreeService
{
    private readonly IDegreeRepository _repo;
    private readonly IAuditLogService _auditLog;
    private readonly ICurrentUserService _currentUser;

    public DegreeService(
        IDegreeRepository repo,
        IAuditLogService auditLog,
        ICurrentUserService currentUser)
    {
        _repo = repo;
        _auditLog = auditLog;
        _currentUser = currentUser;
    }

    public async Task<Degree> CreateAsync(CreateDegreeDto dto)
    {
        var entity = new Degree
        {
            UniversityId = dto.UniversityId,
            DegreeName = dto.DegreeName,
            Duration = dto.Duration,
            Description = dto.Description,
            InsertBy = _currentUser.Username,
            Status = true,
            DegreeTypeId = dto.DegreeTypeId
        };

        var result = await _repo.CreateAsync(entity);

        await _auditLog.LogAsync("degrees", result.Id, "INSERT", null, new
        {
            result.UniversityId,
            result.DegreeTypeId,
            result.DegreeName,
            result.Duration,
            result.Description,
            result.InsertBy
        });

        return result;
    }

    public async Task<List<Degree>> GetAllAsync()
    {
        return await _repo.GetAllAsync();
    }

    public async Task<List<Degree>> GetByUniversityIdAsync(Guid universityId)
    {
        return await _repo.GetByUniversityIdAsync(universityId);
    }

    public async Task<Degree?> GetByIdAsync(Guid id)
    {
        return await _repo.GetByIdAsync(id);
    }

    public async Task<bool> UpdateAsync(UpdateDegreeDto dto)
    {
        var entity = await _repo.GetByIdAsync(dto.Id);

        if (entity == null)
            return false;

        var old = new { entity.DegreeName, entity.Duration, entity.Description, entity.UniversityId, entity.DegreeTypeId };

        entity.UniversityId = dto.UniversityId;
        entity.DegreeTypeId = dto.DegreeTypeId;
        entity.DegreeName = dto.DegreeName;
        entity.Duration = dto.Duration;
        entity.Description = dto.Description;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("degrees", entity.Id, "UPDATE", old, new
        {
            entity.UniversityId,
            entity.DegreeTypeId,
            entity.DegreeName,
            entity.Duration,
            entity.Description,
            entity.UpdateBy
        });

        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await _repo.GetByIdAsync(id);

        if (entity == null)
            return false;

        var old = new { entity.DegreeName, entity.Status };

        entity.Status = false;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("degrees", entity.Id, "DELETE", old, null);

        return true;
    }
}
