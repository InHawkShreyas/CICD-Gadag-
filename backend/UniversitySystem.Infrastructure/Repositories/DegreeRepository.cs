using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class DegreeRepository : IDegreeRepository
{
    private readonly AppDbContext _context;

    public DegreeRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Degree> CreateAsync(Degree entity)
    {
        _context.Set<Degree>().Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<List<Degree>> GetAllAsync()
    {
        return await _context.Set<Degree>()
            .Where(x => x.Status)
            .ToListAsync();
    }

    public async Task<List<Degree>> GetByUniversityIdAsync(Guid universityId)
    {
        return await _context.Set<Degree>()
            .Where(x => x.UniversityId == universityId && x.Status)
            .ToListAsync();
    }

    public async Task<Degree?> GetByIdAsync(Guid id)
    {
        return await _context.Set<Degree>()
            .FirstOrDefaultAsync(x => x.Id == id && x.Status);
    }

    public async Task UpdateAsync(Degree entity)
    {
        _context.Set<Degree>().Update(entity);
        await _context.SaveChangesAsync();
    }
}