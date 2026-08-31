using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class SubjectRepository : ISubjectRepository
{
    private readonly AppDbContext _context;

    public SubjectRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Subject> CreateAsync(Subject entity)
    {
        _context.Set<Subject>().Add(entity);

        await _context.SaveChangesAsync();

        return entity;
    }

    public async Task<List<Subject>> GetAllAsync()
    {
        return await _context.Set<Subject>()
            .Where(x => x.Status == true)
            .OrderBy(x => x.Name)
            .ToListAsync();
    }

    public async Task<Subject?> GetByIdAsync(Guid id)
    {
        return await _context.Set<Subject>()
            .FirstOrDefaultAsync(x =>
                x.Id == id &&
                x.Status == true);
    }

    public async Task UpdateAsync(Subject entity)
    {
        _context.Set<Subject>().Update(entity);

        await _context.SaveChangesAsync();
    }

    public async Task<Subject?> GetByCodeAsync(string code)
        {
            return await _context.Set<Subject>()
                .FirstOrDefaultAsync(x =>
                    x.Code == code &&
                    x.Status == true);
        }


        public async Task DeleteAsync(Guid id)
{
    var entity = await _context.Set<Subject>()
        .FirstOrDefaultAsync(x => x.Id == id);

    if (entity != null)
    {
        entity.Status = false;
        _context.Set<Subject>().Update(entity);
        await _context.SaveChangesAsync();
    }
}
}