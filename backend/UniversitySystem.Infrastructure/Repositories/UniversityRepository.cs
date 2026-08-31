using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class UniversityRepository : IUniversityRepository
{
    private readonly AppDbContext _context;

    public UniversityRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<University> CreateAsync(University entity)
    {
        _context.Set<University>().Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<List<University>> GetAllAsync()
    {
        return await _context.Set<University>()
            .Where(x => x.Status == true)
            .ToListAsync();
    }

    public async Task<University?> GetByIdAsync(Guid id)
    {
        return await _context.Set<University>()
            .FirstOrDefaultAsync(x => x.Id == id && x.Status == true);
    }

    public async Task UpdateAsync(University entity)
    {
        _context.Set<University>().Update(entity);
        await _context.SaveChangesAsync();
    }
}