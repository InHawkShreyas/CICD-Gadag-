using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class CourseRepository : ICourseRepository
{
    private readonly AppDbContext _context;

    public CourseRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Course> CreateAsync(Course entity)
    {
        _context.Set<Course>().Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<List<Course>> GetAllAsync()
    {
        return await _context.Set<Course>()
            .Where(x => x.Status)
            .ToListAsync();
    }

    public async Task<List<Course>> GetByDegreeIdAsync(Guid degreeId)
    {
        return await _context.Set<Course>()
            .Where(x => x.DegreeId == degreeId && x.Status)
            .ToListAsync();
    }

    public async Task<Course?> GetByIdAsync(Guid id)
    {
        return await _context.Set<Course>()
            .FirstOrDefaultAsync(x => x.Id == id && x.Status);
    }

    public async Task UpdateAsync(Course entity)
    {
        _context.Set<Course>().Update(entity);
        await _context.SaveChangesAsync();
    }
}