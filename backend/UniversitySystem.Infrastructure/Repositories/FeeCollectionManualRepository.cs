using Microsoft.EntityFrameworkCore;
using UniversitySystem.Domain.Entities;
using UniversitySystem.Domain.Interfaces;
using UniversitySystem.Infrastructure.Data;

public class FeeCollectionManualRepository : IFeeCollectionManualRepository
{
    private readonly AppDbContext _context;

    public FeeCollectionManualRepository(AppDbContext context)
    {
        _context = context;
    }

    // ✅ CREATE WITH DETAILS
    public async Task<FeeCollectionManual> CreateAsync(FeeCollectionManual entity)
    {
        // Save header + child details together
        await _context.FeeCollectionManuals.AddAsync(entity);

        await _context.SaveChangesAsync();

        return entity;
    }

    // ✅ GET ALL
    public async Task<List<FeeCollectionManual>> GetAllAsync()
    {
        return await _context.FeeCollectionManuals
            .AsNoTracking()
            .Include(x => x.Details)
            .Where(x => x.Status == true)
            .OrderByDescending(x => x.InsertOn)
            .ToListAsync();
    }

    // ✅ GET PAGED
    public async Task<(List<FeeCollectionManual> Items, int TotalCount)> GetPagedAsync(
        int page, int pageSize)
    {
        var query = _context.FeeCollectionManuals
            .AsNoTracking()
            .Where(x => x.Status == true);

        var totalCount = await query.CountAsync();

        var items = await query
            .Include(x => x.Details)
            .OrderByDescending(x => x.InsertOn)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    // ✅ GET BY ID
    public async Task<FeeCollectionManual?> GetByIdAsync(Guid id)
    {
        return await _context.FeeCollectionManuals
            .AsNoTracking()
            .Include(x => x.Details)
            .FirstOrDefaultAsync(x =>
                x.Id == id &&
                x.Status == true);
    }

    // ✅ GET BY APPLICATION NUMBER
    public async Task<List<FeeCollectionManual>> GetByAppNoAsync(string appNo)
    {
        return await _context.FeeCollectionManuals
            .AsNoTracking()
            .Include(x => x.Details)
            .Where(x =>
                x.AppNo == appNo &&
                x.Status == true)
            .OrderByDescending(x => x.InsertOn)
            .ToListAsync();
    }

    // ✅ UPDATE HEADER + DETAILS
    public async Task UpdateAsync(FeeCollectionManual entity)
    {
        // Existing details from DB
        var existingDetails = await _context.FeeCollectionManualDetails
            .Where(x => x.HeaderId == entity.Id)
            .ToListAsync();

        // Remove old details
        _context.FeeCollectionManualDetails.RemoveRange(existingDetails);

        // Add new details
        if (entity.Details != null && entity.Details.Any())
        {
            foreach (var detail in entity.Details)
            {
                detail.Id = detail.Id == Guid.Empty
                    ? Guid.NewGuid()
                    : detail.Id;

                detail.HeaderId = entity.Id;
            }

            await _context.FeeCollectionManualDetails.AddRangeAsync(entity.Details);
        }

        // Update header
        _context.FeeCollectionManuals.Update(entity);

        await _context.SaveChangesAsync();
    }
}