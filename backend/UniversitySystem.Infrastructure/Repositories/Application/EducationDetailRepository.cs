using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class EducationDetailRepository : IEducationDetailRepository
{
    private readonly AppDbContext _context;

    public EducationDetailRepository(AppDbContext context)
    {
        _context = context;
    }

    // ✅ CREATE
    public async Task<EducationDetail> CreateAsync(EducationDetail entity)
    {
        await _context.EducationDetails.AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    // ✅ GET ALL
    public async Task<List<EducationDetail>> GetAllAsync()
    {
        return await _context.EducationDetails
            .Where(x => x.Status == true)
            .OrderByDescending(x => x.InsertOn)
            .ToListAsync();
    }

    // ✅ GET BY APPLICATION ID
    public async Task<List<EducationDetail>> GetByApplicationIdAsync(Guid applicationId)
    {
        return await _context.EducationDetails
            .Where(x => x.ApplicationId == applicationId && x.Status == true)
            .OrderByDescending(x => x.InsertOn)
            .ToListAsync();
    }

    // ✅ GET BY ID
    public async Task<EducationDetail?> GetByIdAsync(Guid id)
    {
        return await _context.EducationDetails
            .FirstOrDefaultAsync(x => x.Id == id && x.Status == true);
    }

    // ✅ UPDATE
    public async Task UpdateAsync(EducationDetail entity)
    {
        _context.EducationDetails.Update(entity);
        await _context.SaveChangesAsync();
    }
}