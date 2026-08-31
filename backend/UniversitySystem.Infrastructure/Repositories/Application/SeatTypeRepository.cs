using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class SeatTypeRepository : ISeatTypeRepository
{
    private readonly AppDbContext _context;

    public SeatTypeRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<SeatType> CreateAsync(SeatType entity)
    {
        await _context.SeatTypes.AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<List<SeatType>> GetAllAsync()
    {
        return await _context.SeatTypes
            .Where(x => x.Status == true)
            .ToListAsync();
    }

    public async Task<List<SeatType>> GetByApplicationIdAsync(Guid applicationId)
    {
        return await _context.SeatTypes
            .Where(x => x.ApplicationId == applicationId && x.Status == true)
            .ToListAsync();
    }

    public async Task<SeatType?> GetByIdAsync(Guid id)
    {
        return await _context.SeatTypes
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task UpdateAsync(SeatType entity)
    {
        _context.SeatTypes.Update(entity);
        await _context.SaveChangesAsync();
    }
}