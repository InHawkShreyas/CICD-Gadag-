using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly AppDbContext _context;

    public AuditLogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(AuditLog log)
    {
        await _context.AuditLogs.AddAsync(log);
        await _context.SaveChangesAsync();
    }

    public async Task<List<AuditLog>> GetAllAsync(int page, int pageSize)
    {
        return await _context.AuditLogs
            .AsNoTracking()
            .OrderByDescending(x => x.PerformedOn)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<List<AuditLog>> GetByRecordIdAsync(Guid recordId)
    {
        return await _context.AuditLogs
            .Where(x => x.RecordId == recordId)
            .OrderByDescending(x => x.PerformedOn)
            .ToListAsync();
    }

    public async Task<int> GetCountAsync()
    {
        return await _context.AuditLogs.CountAsync();
    }
}