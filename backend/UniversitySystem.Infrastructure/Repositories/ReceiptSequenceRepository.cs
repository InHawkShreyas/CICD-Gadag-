using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class ReceiptSequenceRepository : IReceiptSequenceRepository
{
    private readonly AppDbContext _context;

    public ReceiptSequenceRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ReceiptSequence?> GetByYearAsync(string year)
    {
        return await _context.Set<ReceiptSequence>()
            .FirstOrDefaultAsync(x => x.Year == year && x.IsActive);
    }

    public async Task<ReceiptSequence> CreateAsync(ReceiptSequence entity)
    {
        _context.Set<ReceiptSequence>().Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task UpdateAsync(ReceiptSequence entity)
    {
        _context.Set<ReceiptSequence>().Update(entity);
        await _context.SaveChangesAsync();
    }
}