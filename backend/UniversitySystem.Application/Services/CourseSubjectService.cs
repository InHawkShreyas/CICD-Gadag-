public class CourseSubjectService
    : ICourseSubjectService
{
    private readonly ICourseSubjectRepository _repository;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public CourseSubjectService(
        ICourseSubjectRepository repository,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repository = repository;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    public async Task<CourseSubjectDto>
        CreateAsync(
            CreateCourseSubjectDto dto)
    {
        var username =
            _currentUser.Username ?? "system";

        var existing =
            await _repository.GetByMappingAsync(
                dto.DegreeId,
                dto.CourseId,
                dto.SemId,
                dto.SubjectId);

        if (existing != null)
            throw new Exception(
                "Subject already mapped.");

        var entity = new CourseSubject
        {
            Id = Guid.NewGuid(),

            DegreeId = dto.DegreeId,

            CourseId = dto.CourseId,

            SemId = dto.SemId,

            SubjectId = dto.SubjectId,

            InsertBy = username,

            InsertOn = DateTime.UtcNow,

            Status = true
        };

        await _repository.CreateAsync(entity);

        await _auditLog.LogAsync(
            "course_subjects",
            entity.Id,
            "INSERT",
            null,
            entity);

        return Map(entity);
    }

    public async Task<List<CourseSubjectDto>>
        GetAllAsync()
    {
        var entities =
            await _repository.GetAllAsync();

        return entities
            .Select(Map)
            .ToList();
    }

    public async Task<CourseSubjectDto?>
        GetByIdAsync(Guid id)
    {
        var entity =
            await _repository.GetByIdAsync(id);

        if (entity == null)
            return null;

        return Map(entity);
    }

    public async Task UpdateAsync(
        UpdateCourseSubjectDto dto)
    {
        var username =
            _currentUser.Username ?? "system";

        var entity =
            await _repository.GetByIdAsync(dto.Id);

        if (entity == null)
            throw new Exception(
                "Mapping not found.");

        var old = new
        {
            entity.DegreeId,
            entity.CourseId,
            entity.SemId,
            entity.SubjectId
        };

        entity.DegreeId = dto.DegreeId;
        entity.CourseId = dto.CourseId;
        entity.SemId = dto.SemId;
        entity.SubjectId = dto.SubjectId;

        entity.UpdateBy = username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repository.UpdateAsync(entity);

        await _auditLog.LogAsync(
            "course_subjects",
            entity.Id,
            "UPDATE",
            old,
            entity);
    }

    public async Task DeleteAsync(
        Guid id)
    {
        var username =
            _currentUser.Username ?? "system";

        var entity =
            await _repository.GetByIdAsync(id);

        if (entity == null)
            throw new Exception(
                "Mapping not found.");

        entity.Status = false;
        entity.UpdateBy = username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repository.UpdateAsync(entity);

        await _auditLog.LogAsync(
            "course_subjects",
            entity.Id,
            "DELETE",
            null,
            null);
    }

    private static CourseSubjectDto Map(
        CourseSubject entity)
    {
        return new CourseSubjectDto
        {
            Id = entity.Id,
            DegreeId = entity.DegreeId,
            CourseId = entity.CourseId,
            SemId = entity.SemId,
            SubjectId = entity.SubjectId
        };
    }
}