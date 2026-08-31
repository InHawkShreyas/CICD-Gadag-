using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class ExamApplicationRepository
    : IExamApplicationRepository
{
    private readonly AppDbContext _context;

    public ExamApplicationRepository(
        AppDbContext context)
    {
        _context = context;
    }

    public async Task<ExamApplication>
        CreateAsync(
            ExamApplication entity)
    {
        _context.Set<ExamApplication>()
            .Add(entity);

        await _context.SaveChangesAsync();

        return entity;
    }

    public async Task<List<ExamApplication>>
        GetAllAsync()
    {
        return await _context
            .Set<ExamApplication>()
            .Where(x => x.Status == true)
            .OrderByDescending(x => x.InsertOn)
            .ToListAsync();
    }

    public async Task<ExamApplication?>
        GetByIdAsync(Guid id)
    {
        return await _context
            .Set<ExamApplication>()
            .FirstOrDefaultAsync(x =>
                x.Id == id &&
                x.Status == true);
    }

    public async Task UpdateAsync(
        ExamApplication entity)
    {
        _context.Set<ExamApplication>()
            .Update(entity);

        await _context.SaveChangesAsync();
    }

    public async Task<ExamApplication?>GetLastApplicationAsync()
    {
        return await _context
            .Set<ExamApplication>()
            .OrderByDescending(x => x.InsertOn)
            .FirstOrDefaultAsync();
    }
}