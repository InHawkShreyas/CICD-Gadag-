public class CourseService : ICourseService
{
    private readonly ICourseRepository _repo;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public CourseService(
        ICourseRepository repo,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repo = repo;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    // ✅ CREATE
    public async Task<Course> CreateAsync(CreateCourseDto dto)
    {
        var entity = new Course
        {
            DegreeId = dto.DegreeId,
            Name = dto.Name,
            Code = dto.Code,
            TotalSeats = dto.TotalSeats,
            InsertBy = _currentUser.Username,
            Status = true
        };

        var result = await _repo.CreateAsync(entity);

        await _auditLog.LogAsync("courses", result.Id, "INSERT", null, new
        {
            result.DegreeId,
            result.Name,
            result.Code,
            result.TotalSeats,
            result.InsertBy
        });

        return result;
    }

    // ✅ GET ALL
    public async Task<List<Course>> GetAllAsync()
    {
        return await _repo.GetAllAsync();
    }

    // ✅ GET BY DEGREE
    public async Task<List<Course>> GetByDegreeIdAsync(Guid degreeId)
    {
        return await _repo.GetByDegreeIdAsync(degreeId);
    }

    // ✅ GET BY ID
    public async Task<Course?> GetByIdAsync(Guid id)
    {
        return await _repo.GetByIdAsync(id);
    }

    // ✅ UPDATE
    public async Task<bool> UpdateAsync(UpdateCourseDto dto)
    {
        var entity = await _repo.GetByIdAsync(dto.Id);

        if (entity == null)
            return false;

        var old = new { entity.Name, entity.Code, entity.TotalSeats, entity.DegreeId };

        entity.DegreeId = dto.DegreeId;
        entity.Name = dto.Name;
        entity.Code = dto.Code;
        entity.TotalSeats = dto.TotalSeats;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("courses", entity.Id, "UPDATE", old, new
        {
            entity.DegreeId,
            entity.Name,
            entity.Code,
            entity.TotalSeats,
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

        await _auditLog.LogAsync("courses", entity.Id, "DELETE", old, null);

        return true;
    }
}
