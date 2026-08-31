using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class CourseSubjectRepository
    : ICourseSubjectRepository
{
    private readonly AppDbContext _context;

    public CourseSubjectRepository(
        AppDbContext context)
    {
        _context = context;
    }

    public async Task<CourseSubject>
        CreateAsync(CourseSubject entity)
    {
        _context.Set<CourseSubject>()
            .Add(entity);

        await _context.SaveChangesAsync();

        return entity;
    }

    public async Task<List<CourseSubject>>
        GetAllAsync()
    {
        return await _context
            .Set<CourseSubject>()
            .Where(x => x.Status == true)
            .ToListAsync();
    }

    public async Task<CourseSubject?>
        GetByIdAsync(Guid id)
    {
        return await _context
            .Set<CourseSubject>()
            .FirstOrDefaultAsync(x =>
                x.Id == id &&
                x.Status == true);
    }

    public async Task<CourseSubject?>
        GetByMappingAsync(
            Guid degreeId,
            Guid courseId,
            Guid semId,
            Guid subjectId)
    {
        return await _context
            .Set<CourseSubject>()
            .FirstOrDefaultAsync(x =>
                x.DegreeId == degreeId &&
                x.CourseId == courseId &&
                x.SemId == semId &&
                x.SubjectId == subjectId &&
                x.Status == true);
    }

    public async Task UpdateAsync(
        CourseSubject entity)
    {
        _context.Set<CourseSubject>()
            .Update(entity);

        await _context.SaveChangesAsync();
    }
}