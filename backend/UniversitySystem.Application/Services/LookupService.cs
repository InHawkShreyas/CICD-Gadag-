public class LookupService : ILookupService
{
    private readonly ILookupRepository _repo;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public LookupService(
        ILookupRepository repo,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repo = repo;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    // ✅ GET ALL
    public async Task<List<LookupResponseDto>> GetAllAsync()
    {
        var data = await _repo.GetAllAsync();

        return [.. data.Select(x => new LookupResponseDto
        {
            Id = x.Id,
            Code = x.Code,
            Name = x.Name,
            Type = x.Type,
            Type2 = x.Type2,
            StartDate = x.StartDate,
            EndDate = x.EndDate
        })];
    }

    // ✅ GET BY TYPE (type required, type2 optional)
    public async Task<List<LookupResponseDto>> GetByTypeAndType(string type, string? type2)
    {
        var data = await _repo.GetByTypeAndType(type, type2);

        return data.Select(x => new LookupResponseDto
        {
            Id = x.Id,
            Code = x.Code,
            Name = x.Name,
            Type = x.Type,
            Type2 = x.Type2,
            StartDate = x.StartDate,
            EndDate = x.EndDate
        }).ToList();
    }

    // ✅ CREATE
    public async Task<LookupResponseDto> CreateAsync(CreateLookupDto dto)
    {
        var entity = new Lookup
        {
            Id = Guid.NewGuid(),
            Code = dto.Code,
            Name = dto.Name,
            Description = dto.Description,
            Type = dto.Type,
            Type2 = dto.Type2,
            ExtraInt1 = dto.ExtraInt1,
            ExtraInt2 = dto.ExtraInt2,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            ExtraDescription = dto.ExtraDescription,
            Status = true,
            InsertBy = _currentUser.Username
        };

        var result = await _repo.AddAsync(entity);

        await _auditLog.LogAsync("lookups", result.Id, "INSERT", null, new
        {
            result.Code,
            result.Name,
            result.Type,
            result.Type2,
            result.InsertBy
        });

        return new LookupResponseDto
        {
            Id = result.Id,
            Code = result.Code,
            Name = result.Name,
            Type = result.Type,
            Type2 = result.Type2,
            StartDate = result.StartDate,
            EndDate = result.EndDate
        };
    }

    // ✅ UPDATE
    public async Task UpdateAsync(Guid id, CreateLookupDto dto)
    {
        var entity = await _repo.GetByIdAsync(id);

        if (entity == null)
            throw new ApplicationException("Lookup not found");

        var old = new { entity.Code, entity.Name, entity.Type, entity.Type2 };

        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.Description = dto.Description;
        entity.Type = dto.Type;
        entity.Type2 = dto.Type2;
        entity.ExtraInt1 = dto.ExtraInt1;
        entity.ExtraInt2 = dto.ExtraInt2;
        entity.StartDate = dto.StartDate;
        entity.EndDate = dto.EndDate;
        entity.ExtraDescription = dto.ExtraDescription;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("lookups", entity.Id, "UPDATE", old, new
        {
            entity.Code,
            entity.Name,
            entity.Type,
            entity.Type2,
            entity.UpdateBy
        });
    }

    // ✅ DELETE (SOFT)
    public async Task DeleteAsync(Guid id)
    {
        var entity = await _repo.GetByIdAsync(id);

        if (entity == null)
            throw new ApplicationException("Lookup not found");

        var old = new { entity.Code, entity.Name, entity.Status };

        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.DeleteAsync(entity);

        await _auditLog.LogAsync("lookups", entity.Id, "DELETE", old, null);
    }
}
