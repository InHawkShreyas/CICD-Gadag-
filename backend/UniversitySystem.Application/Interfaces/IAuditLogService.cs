using UniversitySystem.Application.Dtos;

public interface IAuditLogService
{
    Task LogAsync(string tableName, Guid recordId, string action, object? oldData, object? newData);
    Task<AuditLogResponse> GetAllAsync(int page, int pageSize);
    Task<List<AuditLog>> GetByRecordIdAsync(Guid recordId);
}