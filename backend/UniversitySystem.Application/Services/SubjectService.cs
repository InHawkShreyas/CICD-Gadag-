public class SubjectService : ISubjectService
{
    private readonly ISubjectRepository _repository;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public SubjectService(
        ISubjectRepository repository,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repository = repository;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    public async Task<SubjectDto> CreateAsync(
        CreateSubjectDto dto)
    {
        var username =
            _currentUser.Username ?? "system";

        var existing =
            await _repository.GetByCodeAsync(dto.Code);

        if (existing != null)
            throw new Exception(
                "Subject code already exists.");

        var entity = new Subject
        {
            Id = Guid.NewGuid(),

            Name = dto.Name,

            Code = dto.Code,

            MaxMarks = dto.MaxMarks,

            MinMarks = dto.MinMarks,

            InsertBy = username,

            InsertOn = DateTime.UtcNow,

            Status = true
        };

        await _repository.CreateAsync(entity);

        await _auditLog.LogAsync(
            "subjects",
            entity.Id,
            "INSERT",
            null,
            new
            {
                entity.Name,
                entity.Code,
                entity.MaxMarks,
                entity.MinMarks,
                entity.InsertBy
            });

        return Map(entity);
    }

    public async Task<List<SubjectDto>>
        GetAllAsync()
    {
        var entities =
            await _repository.GetAllAsync();

        return entities
            .Select(Map)
            .ToList();
    }

    public async Task<SubjectDto?>
        GetByIdAsync(Guid id)
    {
        var entity =
            await _repository.GetByIdAsync(id);

        return entity == null
            ? null
            : Map(entity);
    }

    public async Task UpdateAsync(
        UpdateSubjectDto dto)
    {
        var username =
            _currentUser.Username ?? "system";

        var entity =
            await _repository.GetByIdAsync(dto.Id);

        if (entity == null)
            throw new Exception(
                "Subject not found.");

        var existing =
            await _repository.GetByCodeAsync(dto.Code);

        if (
            existing != null &&
            existing.Id != dto.Id)
        {
            throw new Exception(
                "Subject code already exists.");
        }

        var old = new
        {
            entity.Name,
            entity.Code,
            entity.MaxMarks,
            entity.MinMarks
        };

        entity.Name = dto.Name;
        entity.Code = dto.Code;
        entity.MaxMarks = dto.MaxMarks;
        entity.MinMarks = dto.MinMarks;

        entity.UpdateBy = username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repository.UpdateAsync(entity);

        await _auditLog.LogAsync(
            "subjects",
            entity.Id,
            "UPDATE",
            old,
            new
            {
                entity.Name,
                entity.Code,
                entity.MaxMarks,
                entity.MinMarks,
                entity.UpdateBy
            });
    }

    private static SubjectDto Map(
        Subject entity)
    {
        return new SubjectDto
        {
            Id = entity.Id,
            Name = entity.Name,
            Code = entity.Code,
            MaxMarks = entity.MaxMarks,
            MinMarks = entity.MinMarks
        };
    }


    public async Task DeleteAsync(Guid id)
{
    var username = _currentUser.Username ?? "system";

    var entity = await _repository.GetByIdAsync(id);

    if (entity == null)
        throw new Exception("Subject not found.");

    entity.Status = false;
    entity.UpdateBy = username;
    entity.UpdateOn = DateTime.UtcNow;

    await _repository.UpdateAsync(entity);

    await _auditLog.LogAsync(
        "subjects",
        entity.Id,
        "DELETE",
        new { entity.Name, entity.Code },
        new { DeletedBy = username });
}
}