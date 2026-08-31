using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class ApplicationVerificationRepository : IApplicationVerificationRepository
{
    private readonly AppDbContext _context;

    public ApplicationVerificationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApplicationVerification> CreateAsync(ApplicationVerification entity)
    {
        _context.ApplicationVerifications.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task UpdateAsync(ApplicationVerification entity)
    {
        _context.ApplicationVerifications.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task<ApplicationVerification?> GetByIdAsync(Guid id)
    {
        return await _context.ApplicationVerifications
            .FirstOrDefaultAsync(x => x.Id == id && x.Status == true);
    }

    public async Task<List<ApplicationVerification>> GetAllAsync()
    {
        return await _context.ApplicationVerifications
            .Where(x => x.Status == true)
            .OrderByDescending(x => x.InsertOn)
            .ToListAsync();
    }

    public async Task<ApplicationVerification?> GetByAppNoAsync(string appNo)
    {
        return await _context.ApplicationVerifications
            .FirstOrDefaultAsync(x => x.AppNo == appNo && x.Status == true);
    }
}