public interface IAuditLogRepository
{
    Task AddAsync(AuditLog log);
    Task<List<AuditLog>> GetAllAsync(int page, int pageSize);
    Task<List<AuditLog>> GetByRecordIdAsync(Guid recordId);
    Task<int> GetCountAsync();
}