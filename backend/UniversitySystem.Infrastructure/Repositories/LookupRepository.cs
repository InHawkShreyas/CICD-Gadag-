using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class LookupRepository : ILookupRepository
{
    private readonly AppDbContext _context;

    public LookupRepository(AppDbContext context)
    {
        _context = context;
    }

    // ✅ Only ACTIVE records
    public async Task<List<Lookup>> GetAllAsync()
    {
        return await _context.Lookups
            .Where(x => x.Status) // 🔥 filter active
            .ToListAsync();
    }

    // ✅ Only ACTIVE by type
   

    public async Task<Lookup?> GetByIdAsync(Guid id)
    {
        return await _context.Lookups
            .FirstOrDefaultAsync(x => x.Id == id && x.Status); // 🔥 only active
    }

    public async Task<Lookup> AddAsync(Lookup entity)
    {
        await _context.Lookups.AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

   

public async Task UpdateAsync(Lookup entity)
{
    var existing = await _context.Lookups.FirstOrDefaultAsync(x => x.Id == entity.Id);

    if (existing == null)
        throw new Exception("Lookup not found");

    _context.Entry(existing).CurrentValues.SetValues(entity);

    await _context.SaveChangesAsync();
}
    // 🔥 SOFT DELETE (REPLACED HARD DELETE)
   public async Task DeleteAsync(Lookup entity)
{
    var existing = await _context.Lookups.FirstOrDefaultAsync(x => x.Id == entity.Id);

    if (existing == null)
        throw new Exception("Lookup not found");

    existing.Status = false;

    await _context.SaveChangesAsync();
}

    public async Task<List<Lookup>> GetByTypeAndType(string type, string? type2)
    {
        var query = _context.Lookups
            .Where(x => x.Status && x.Type == type);

        if (!string.IsNullOrEmpty(type2))
        {
            query = query.Where(x => x.Type2 == type2);
        }

        return await query.ToListAsync();
    }

    public async Task<string?> GetNameByIdAsync(Guid id)
{
    return await _context.Lookups
        .Where(x => x.Id == id && x.Status)
        .Select(x => x.Name)
        .FirstOrDefaultAsync();
}
}