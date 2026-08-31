public class SeatTypeService : ISeatTypeService
{
    private readonly ISeatTypeRepository _repo;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public SeatTypeService(
        ISeatTypeRepository repo,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repo = repo;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    // ✅ CREATE
    public async Task<SeatType> CreateAsync(CreateSeatTypeDto dto)
    {
        var entity = new SeatType
        {
            Id = Guid.NewGuid(),
            ApplicationId = dto.ApplicationId,
            ApplicationNo = dto.ApplicationNo,
            SeatTypeId = dto.SeatTypeId,
            SeatTypeName = dto.SeatTypeName,
            InsertBy = _currentUser.Username,
            Status = true
        };

        var result = await _repo.CreateAsync(entity);

        await _auditLog.LogAsync("seat_type", result.Id, "INSERT", null, new
        {
            result.ApplicationId,
            result.SeatTypeId,
            result.SeatTypeName
        });

        return result;
    }

    // ✅ GET ALL
    public async Task<List<SeatType>> GetAllAsync()
    {
        return await _repo.GetAllAsync();
    }

    // ✅ GET BY APPLICATION
    public async Task<List<SeatType>> GetByApplicationIdAsync(Guid applicationId)
    {
        return await _repo.GetByApplicationIdAsync(applicationId);
    }

    // ✅ GET BY ID
    public async Task<SeatType?> GetByIdAsync(Guid id)
    {
        return await _repo.GetByIdAsync(id);
    }

    // ✅ UPDATE
    public async Task<bool> UpdateAsync(UpdateSeatTypeDto dto)
    {
        var entity = await _repo.GetByIdAsync(dto.Id);

        if (entity == null)
            return false;

        var old = new
        {
            entity.SeatTypeId,
            entity.SeatTypeName
        };

        entity.SeatTypeId = dto.SeatTypeId;
        entity.SeatTypeName = dto.SeatTypeName;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("seat_type", entity.Id, "UPDATE", old, new
        {
            entity.SeatTypeId,
            entity.SeatTypeName
        });

        return true;
    }

    // ✅ DELETE (SOFT)
    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await _repo.GetByIdAsync(id);

        if (entity == null)
            return false;

        var old = new { entity.Status };

        entity.Status = false;
        entity.UpdateBy = _currentUser.Username;
        entity.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(entity);

        await _auditLog.LogAsync("seat_type", entity.Id, "DELETE", old, null);

        return true;
    }
}