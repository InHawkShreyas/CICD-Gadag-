using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class AdmissionFeeStructureRepository : IAdmissionFeeStructureRepository
{
    private readonly AppDbContext _context;

    public AdmissionFeeStructureRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<AdmissionFeeStructure> CreateAsync(AdmissionFeeStructure entity)
    {
        _context.AdmissionFeeStructures.Add(entity);

        await _context.SaveChangesAsync();

        return entity;
    }

    public async Task<List<AdmissionFeeStructure>> GetAllAsync()
    {
        return await _context.AdmissionFeeStructures
            .Include(x => x.Details)
            .Where(x => x.Status == true)
            .ToListAsync();
    }

    public async Task<AdmissionFeeStructure?> GetByIdAsync(Guid id)
    {
        return await _context.AdmissionFeeStructures
            .Include(x => x.Details)
            .FirstOrDefaultAsync(x => x.Id == id && x.Status == true);
    }

    public async Task<bool> UpdateAsync(AdmissionFeeStructure entity)
    {
        // The service already loaded this entity (via GetByIdAsync on the same scoped
        // DbContext), applied master-field changes, marked old details as Deleted, and
        // marked new details as Added. Calling Update() here would reset those child-
        // entity states (Deleted/Added → Modified), breaking the insert/delete logic.
        // Just flush the already-tracked changes in one save.
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await _context.AdmissionFeeStructures.FindAsync(id);

        if (entity == null)
            return false;

        entity.Status = false;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<AdmissionFeeStructure?> GetByFiltersAsync(
        Guid degreeId,
        Guid courseId,
        Guid? categoryId = null,
        Guid? academicYearId = null)
    {
        return await _context.AdmissionFeeStructures
            .Include(x => x.Details)
            .FirstOrDefaultAsync(x =>
                x.DegreeId == degreeId &&
                x.CourseId == courseId &&
                (categoryId == null || x.CategoryId == categoryId) &&
                (academicYearId == null || x.AcademicYearId == academicYearId) &&
                x.Status == true
            );
    }
}