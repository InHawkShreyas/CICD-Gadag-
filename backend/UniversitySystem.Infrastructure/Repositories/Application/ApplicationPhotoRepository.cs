using Microsoft.EntityFrameworkCore;
using Npgsql;
using UniversitySystem.Infrastructure.Data;

public class ApplicationPhotoRepository : IApplicationPhotoRepository
{
    private readonly AppDbContext _context;

    public ApplicationPhotoRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<application_photo?> GetByApplicationIdAsync(Guid applicationId)
    {
        return await _context.application_Photos
            .FirstOrDefaultAsync(x => x.ApplicationId == applicationId && x.Status);
    }

    public async Task<application_photo> UpsertAsync(application_photo entity)
    {
        var existing = await _context.application_Photos
            .FirstOrDefaultAsync(x => x.ApplicationId == entity.ApplicationId);

        if (existing == null)
        {
            try
            {
                _context.application_Photos.Add(entity);
                await _context.SaveChangesAsync();
                return entity;
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                _context.Entry(entity).State = EntityState.Detached;

                existing = await _context.application_Photos
                    .FirstAsync(x => x.ApplicationId == entity.ApplicationId);
            }
        }

        existing.PhotoUrl = entity.PhotoUrl ?? existing.PhotoUrl;
        existing.SignatureUrl = entity.SignatureUrl ?? existing.SignatureUrl;
        existing.ParentSignUrl = entity.ParentSignUrl ?? existing.ParentSignUrl;
        existing.UpdateBy = entity.InsertBy;
        existing.UpdateOn = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return existing;
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        // Npgsql wraps the actual Postgres error in InnerException
        return ex.InnerException is PostgresException pgEx && pgEx.SqlState == "23505"; // unique_violation
    }
}