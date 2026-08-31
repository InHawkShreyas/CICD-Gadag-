using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class AcademicYearRepository : IAcademicYearRepository
{
    private readonly AppDbContext _context;

    public AcademicYearRepository(AppDbContext context)
    {
        _context = context;
    }

    // ✅ CREATE
    public async Task<AcademicYear> CreateAsync(AcademicYear entity)
    {
        _context.AcademicYears.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    // ✅ GET ALL (ONLY ACTIVE)
    public async Task<List<AcademicYear>> GetAllAsync()
    {
        return await _context.AcademicYears
            .Where(x => x.Status == true)
            .OrderByDescending(x => x.InsertOn)
            .ToListAsync();
    }

    // ✅ GET BY ID
    public async Task<AcademicYear?> GetByIdAsync(Guid id)
    {
        return await _context.AcademicYears
            .FirstOrDefaultAsync(x => x.Id == id && x.Status == true);
    }

    // ✅ UPDATE
    public async Task UpdateAsync(AcademicYear entity)
    {
        _context.AcademicYears.Update(entity);
        await _context.SaveChangesAsync();
    }
}