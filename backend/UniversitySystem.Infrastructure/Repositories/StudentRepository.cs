using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class StudentRepository : IStudentRepository
{
    private readonly AppDbContext _context;
    public StudentRepository(AppDbContext context)
    {
        _context = context;
    }
    public async Task<Student> CreateAsync(Student entity)
    {
        _context.Students.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }
    public async Task<List<Student>> CreateBulkAsync(List<Student> entities)
    {
        _context.Students.AddRange(entities);
        await _context.SaveChangesAsync();
        return entities;
    }
    public async Task<List<Student>> GetAllAsync()
    {
        return await _context.Students.ToListAsync();
    }
    public async Task<Student?> GetByIdAsync(Guid id)
    {
        return await _context.Students.FindAsync(id);
    }

    public async Task<Student?> GetByRegistrationNumberAsync(string registrationNumber)
    {
        return await _context.Students
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RegistrationNumber == registrationNumber && s.Status == true);
    }

    public async Task<bool> UpdateAsync(Student entity)
    {
        _context.Students.Update(entity);
        await _context.SaveChangesAsync();
        return true;
    }
    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await _context.Students.FindAsync(id);
        if (entity == null) return false;
        _context.Students.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }
}