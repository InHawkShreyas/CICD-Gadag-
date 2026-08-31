public class UniversityService : IUniversityService
{
    private readonly IUniversityRepository _repo;
    private readonly IAuditLogService _auditLog;
    private readonly ICurrentUserService _currentUser;

    public UniversityService(
        IUniversityRepository repo,
        IAuditLogService auditLog,
        ICurrentUserService currentUser)
    {
        _repo = repo;
        _auditLog = auditLog;
        _currentUser = currentUser;
    }

    public async Task<University> CreateAsync(CreateUniversityDto dto)
    {
        var entity = new University
        {
            Name = dto.Name,
            Address = dto.Address,
            PhoneNo = dto.PhoneNo,
            Email = dto.Email,
            InsertBy = _currentUser.Username,
            Status = true
        };

        var result = await _repo.CreateAsync(entity);

        await _auditLog.LogAsync("universities", result.Id, "INSERT", null, new
        {
            result.Name,
            result.Address,
            result.PhoneNo,
            result.Email,
            result.InsertBy
        });

        return result;
    }

    public async Task<List<University>> GetAllAsync()
    {
        return await _repo.GetAllAsync();
    }

    public async Task<University?> GetByIdAsync(Guid id)
    {
        return await _repo.GetByIdAsync(id);
    }

    public async Task<bool> UpdateAsync(UpdateUniversityDto dto)
    {
        var entity = await _repo.GetByIdAsync(dto.Id);

        if (entity == null)
            return false;

        var old = new { entity.Name, entity.Address, entity.PhoneNo, entity.Email };

        entity.Name = dto.Name;
        entity.Address = dto.Address;
        entity.PhoneNo = dto.PhoneNo;
        entity.Email = dto.Email;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("universities", entity.Id, "UPDATE", old, new
        {
            entity.Name,
            entity.Address,
            entity.PhoneNo,
            entity.Email,
            entity.UpdateBy
        });

        return true;
    }

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

        await _auditLog.LogAsync("universities", entity.Id, "DELETE", old, null);

        return true;
    }
}
