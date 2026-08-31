using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class NotificationRepository : INotificationRepository
{
    private readonly AppDbContext _context;

    public NotificationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Notification> CreateAsync(Notification entity)
    {
        _context.Set<Notification>().Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<List<Notification>> GetAllAsync()
    {
        return await _context.Set<Notification>()
            .Where(x => x.Status == true) // 🔥 only active
            .OrderByDescending(x => x.Date)
            .ToListAsync();
    }

    public async Task<Notification?> GetByIdAsync(Guid id)
    {
        return await _context.Set<Notification>()
            .FirstOrDefaultAsync(x => x.Id == id && x.Status == true);
    }

    public async Task UpdateAsync(Notification entity)
    {
        _context.Set<Notification>().Update(entity);
        await _context.SaveChangesAsync();
    }
}