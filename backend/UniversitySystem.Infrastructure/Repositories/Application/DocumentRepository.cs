using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class ApplicationDocumentRepository : IApplicationDocumentRepository
{
    private readonly AppDbContext _context;

    public ApplicationDocumentRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task CreateAsync(ApplicationDocument entity)
    {
        await _context.ApplicationDocuments.AddAsync(entity);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(ApplicationDocument entity)
    {
        _context.ApplicationDocuments.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task<ApplicationDocument?> GetByIdAsync(Guid id)
    {
        return await _context.ApplicationDocuments
            .FirstOrDefaultAsync(x => x.Id == id && x.Status);
    }

    public async Task<List<ApplicationDocument>> GetAllAsync()
    {
        return await _context.ApplicationDocuments
            .Where(x => x.Status)
            .ToListAsync();
    }

public async Task<List<ApplicationDocument>> GetByApplicationIdAsync(Guid applicationId)
{
    return await _context.ApplicationDocuments
        .Where(x => x.Status == true &&
                    x.ApplicationId == applicationId)
        .ToListAsync();
}
public async Task<Applications?> GetByAppNoAsync(string applicationNo)
{
    return await _context.Applications
        .FirstOrDefaultAsync(x => x.AppNo == applicationNo);
}


   
}