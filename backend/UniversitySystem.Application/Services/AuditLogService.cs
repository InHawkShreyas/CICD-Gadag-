using System.Text.Json;
using Microsoft.AspNetCore.Http;
using UniversitySystem.Application.Dtos;

public class AuditLogService : IAuditLogService
{
    private readonly IAuditLogRepository _repo;
    private readonly ICurrentUserService _currentUser;
    private readonly IHttpContextAccessor _httpContext;

    public AuditLogService(
        IAuditLogRepository repo,
        ICurrentUserService currentUser,
        IHttpContextAccessor httpContext)
    {
        _repo = repo;
        _currentUser = currentUser;
        _httpContext = httpContext;
    }

    public async Task LogAsync(
        string tableName,
        Guid recordId,
        string action,
        object? oldData,
        object? newData)
    {
        var ip = _httpContext.HttpContext?.Connection?.RemoteIpAddress?.ToString();

        var log = new AuditLog
        {
            Id = Guid.NewGuid(),
            TableName = tableName,
            RecordId = recordId,
            Action = action,
            OldData = oldData != null ? JsonSerializer.Serialize(oldData) : null,
            NewData = newData != null ? JsonSerializer.Serialize(newData) : null,
            PerformedBy = _currentUser.Username,
            PerformedOn = DateTime.UtcNow,
            IpAddress = ip
        };

        await _repo.AddAsync(log);
    }

    public async Task<AuditLogResponse> GetAllAsync(int page, int pageSize)
    {
        return new AuditLogResponse
        {
            TotalCount = await _repo.GetCountAsync(),
            Items = await _repo.GetAllAsync(page, pageSize)
        };
    }

    public async Task<List<AuditLog>> GetByRecordIdAsync(Guid recordId)
    {
        return await _repo.GetByRecordIdAsync(recordId);
    }
}