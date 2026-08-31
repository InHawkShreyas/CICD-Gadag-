using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class ExamApplicationDetailRepository
    : IExamApplicationDetailRepository
{
    private readonly AppDbContext _context;

    public ExamApplicationDetailRepository(
        AppDbContext context)
    {
        _context = context;
    }

    public async Task CreateRangeAsync(
        List<ExamApplicationDetail> entities)
    {
        await _context
            .Set<ExamApplicationDetail>()
            .AddRangeAsync(entities);

        await _context.SaveChangesAsync();
    }

    public async Task<List<ExamApplicationDetail>>
        GetByApplicationIdAsync(
            Guid applicationId)
    {
        return await _context
            .Set<ExamApplicationDetail>()
            .Where(x =>
                x.ExamApplicationId ==
                    applicationId &&
                x.Status == true)
            .ToListAsync();
    }

    public async Task UpdateAsync(
        ExamApplicationDetail entity)
    {
        _context.Set<ExamApplicationDetail>()
            .Update(entity);

        await _context.SaveChangesAsync();
    }

    public async Task DeleteByApplicationIdAsync(
        Guid applicationId)
    {
        var details = await _context
            .Set<ExamApplicationDetail>()
            .Where(x =>
                x.ExamApplicationId ==
                    applicationId &&
                x.Status == true)
            .ToListAsync();

        foreach (var item in details)
        {
            item.Status = false;
        }

        await _context.SaveChangesAsync();
    }
}