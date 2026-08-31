using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class AcademicDateRepository : IAcademicDateRepository
{
    private readonly AppDbContext _context;

    public AcademicDateRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<AcademicDate> CreateAsync(AcademicDate entity)
    {
        _context.Set<AcademicDate>().Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<List<AcademicDate>> GetAllAsync()
    {
        return await _context.Set<AcademicDate>()
            .Where(x => x.Status)
            .ToListAsync();
    }

    public async Task<AcademicDate?> GetByIdAsync(Guid id)
    {
        return await _context.Set<AcademicDate>()
            .FirstOrDefaultAsync(x => x.Id == id && x.Status);
    }

    public async Task UpdateAsync(AcademicDate entity)
    {
        _context.Set<AcademicDate>().Update(entity);
        await _context.SaveChangesAsync();
    }
}