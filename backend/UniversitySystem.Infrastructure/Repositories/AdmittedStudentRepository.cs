using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class AdmittedStudentRepository : IAdmittedStudentRepository
{
    private readonly AppDbContext _context;

    public AdmittedStudentRepository(AppDbContext context)
    {
        _context = context;
    }

    // ✅ CREATE
    public async Task<AdmittedStudent> CreateAsync(AdmittedStudent entity)
    {
        await _context.AdmittedStudents.AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    // ✅ GET ALL
    public async Task<List<AdmittedStudent>> GetAllAsync()
    {
        return await _context.AdmittedStudents
            .OrderByDescending(x => x.InsertOn)
            .ToListAsync();
    }

    // ✅ GET BY ID
    public async Task<AdmittedStudent?> GetByIdAsync(Guid id)
    {
        return await _context.AdmittedStudents
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    // ✅ GET BY APPLICATION ID (🔥 IMPORTANT)
    public async Task<AdmittedStudent?> GetByApplicationIdAsync(Guid applicationId)
    {
        return await _context.AdmittedStudents
            .FirstOrDefaultAsync(x => x.ApplicationId == applicationId);
    }

    // ✅ CHECK DUPLICATE (🔥 IMPORTANT)
    public async Task<bool> ExistsByApplicationIdAsync(Guid applicationId)
    {
        return await _context.AdmittedStudents
            .AnyAsync(x => x.ApplicationId == applicationId);
    }

    // ✅ UPDATE
    public async Task UpdateAsync(AdmittedStudent entity)
    {
        _context.AdmittedStudents.Update(entity);
        await _context.SaveChangesAsync();
    }
}