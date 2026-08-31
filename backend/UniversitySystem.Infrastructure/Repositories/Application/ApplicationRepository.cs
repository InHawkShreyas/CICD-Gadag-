using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class ApplicationRepository : IApplicationRepository
{
    private readonly AppDbContext _context;

    public ApplicationRepository(AppDbContext context)
    {
        _context = context;
    }

    // ✅ CREATE
    public async Task<Applications> CreateAsync(Applications entity)
    {
        await _context.Applications.AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    // ✅ GET ALL
    public async Task<List<Applications>> GetAllAsync()
    {
        return await _context.Applications
            .Where(x => x.Status == true)
            .OrderByDescending(x => x.InsertOn)
            .ToListAsync();
    }

    // ✅ GET BY ID
    public async Task<Applications?> GetByIdAsync(Guid id)
    {
        return await _context.Applications
            .FirstOrDefaultAsync(x => x.Id == id && x.Status == true);
    }

    // ✅ GET BY APPLICATION NUMBER
    public async Task<Applications?> GetByAppNoAsync(string appNo)
    {
        return await _context.Applications
            .FirstOrDefaultAsync(x => x.AppNo == appNo && x.Status == true);
    }

    // ✅ UPDATE
    public async Task UpdateAsync(Applications entity)
    {
        _context.Applications.Update(entity);
        await _context.SaveChangesAsync();
    }
    public async Task<Applications?> GetByAppNoAndUserAsync(string appNo, string username)
    {
        return await _context.Applications
            .FirstOrDefaultAsync(x =>
                x.AppNo == appNo &&
                x.InsertBy == username &&
                x.Status == true
            );
    }
    public async Task<Applications?> GetLatestByUsernameAsync(string username)
    {
        return await _context.Applications
            .Where(x => x.InsertBy == username && x.Status == true)
            .OrderByDescending(x => x.InsertOn) // latest application
            .FirstOrDefaultAsync();
    }

    public async Task<List<Applications>> GetAllWithDetailsAsync()
    {
        return await _context.Applications
            .Where(x => x.Status == true)
            .Include(x => x.EducationDetails.Where(e => e.Status == true))
            .Include(x => x.CourseDetails.Where(c => c.Status == true))
            .Include(x => x.SeatTypes.Where(s => s.Status == true))
            .Include(x => x.Documents.Where(d => d.Status == true))
            .Include(x => x.Verification)
            .OrderByDescending(x => x.InsertOn)
            .AsSplitQuery()
            .ToListAsync();
    }

    public async Task<List<Applications>> GetAllForDocumentVerificationAsync()
    {
        return await _context.Applications
            .Where(x => x.Status == true)
            .Include(x => x.CourseDetails.Where(c => c.Status == true))
            .Include(x => x.Verification)
            .OrderByDescending(x => x.InsertOn)
            .AsSplitQuery()
            .ToListAsync();
    }
}
