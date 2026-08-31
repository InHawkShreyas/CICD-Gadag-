using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;
public class ApplicationCourseDetailRepository : IApplicationCourseDetailRepository
{
    private readonly AppDbContext _context;
    public ApplicationCourseDetailRepository(AppDbContext context)
    {
        _context = context;
    }
    public async Task<ApplicationCourseDetail> CreateAsync(ApplicationCourseDetail entity)
    {
        await _context.ApplicationCourseDetails.AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }
    public async Task<List<ApplicationCourseDetail>> GetAllAsync()
    {
        return await _context.ApplicationCourseDetails
            .Where(x => x.Status == true)
            .OrderBy(x => x.ApplicationId)
            .ThenBy(x => x.Preference)
            .ThenBy(x => x.InsertOn)
            .ToListAsync();
    }
    public async Task<List<ApplicationCourseDetail>> GetByApplicationIdAsync(Guid applicationId)
    {
        return await _context.ApplicationCourseDetails
            .Where(x => x.ApplicationId == applicationId && x.Status == true)
            .OrderBy(x => x.Preference)
            .ThenBy(x => x.InsertOn)
            .ToListAsync();
    }
    public async Task<ApplicationCourseDetail?> GetByIdAsync(Guid id)
    {
        return await _context.ApplicationCourseDetails
            .FirstOrDefaultAsync(x => x.Id == id);
    }
    public async Task UpdateAsync(ApplicationCourseDetail entity)
    {
        _context.ApplicationCourseDetails.Update(entity);
        await _context.SaveChangesAsync();
    }
    public async Task<List<ApplicationCourseDetail>> CreateBulkAsync(IEnumerable<ApplicationCourseDetail> entities)
    {
        var list = entities.ToList();
        await _context.ApplicationCourseDetails.AddRangeAsync(list);
        await _context.SaveChangesAsync();
        return list;
    }

    public async Task DeleteAsync(ApplicationCourseDetail entity)
    {
        _context.ApplicationCourseDetails.Remove(entity);
        await _context.SaveChangesAsync();
    }
}