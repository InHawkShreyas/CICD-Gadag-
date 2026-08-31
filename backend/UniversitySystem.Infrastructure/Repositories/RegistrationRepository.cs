using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class RegistrationRepository : IRegistrationRepository
{
    private readonly AppDbContext _context;

    public RegistrationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Registration> CreateAsync(Registration entity)
    {
        _context.Registrations.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<Registration?> GetByUsernameAsync(string username)
    {
        return await _context.Registrations
            .FirstOrDefaultAsync(x => x.Username == username && x.Status == true);
    }

    public async Task<List<Registration>> GetAllAsync()
    {
        return await _context.Registrations
            .Where(x => x.Status == true)
            .ToListAsync();
    }

    public async Task SoftDeleteByUsernameAsync(string username)
    {
        var user = await _context.Registrations
            .FirstOrDefaultAsync(x => x.Username == username && x.Status == true);

        if (user == null)
            return;

        user.Status = false;
        user.UpdateOn = DateTime.UtcNow;

        _context.Registrations.Update(user);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateExamRegistrationAsync(string username, bool examRegistration)
    {
        var user = await _context.Registrations
            .FirstOrDefaultAsync(x => x.Username == username && x.Status == true);

        if (user == null)
            return;

        user.ExamRegistration = examRegistration;
        user.UpdateOn = DateTime.UtcNow;

        _context.Registrations.Update(user);
        await _context.SaveChangesAsync();
    }

    public async Task<Registration?> GetByAadharAsync(string aadharNo)
    {
        return await _context.Registrations
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.AadharNo == aadharNo && r.Status == true);
    }

    public async Task<Registration?> GetByPassportAsync(string passportNo)
    {
        return await _context.Registrations
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.PassportNo == passportNo && r.Status == true);
    }

    // Returns every active registration row under this Aadhaar — one identity
    // can now legitimately have several rows (one per degree type), so the
    // single-result lookup above isn't enough for the degree-type filtering rule.
    public async Task<List<Registration>> GetAllByAadharAsync(string aadharNo)
    {
        return await _context.Registrations
            .AsNoTracking()
            .Where(r => r.AadharNo == aadharNo && r.Status == true)
            .ToListAsync();
    }

    public async Task<List<Registration>> GetAllByPassportAsync(string passportNo)
    {
        return await _context.Registrations
            .AsNoTracking()
            .Where(r => r.PassportNo == passportNo && r.Status == true)
            .ToListAsync();
    }

    public async Task UpdateAsync(Registration entity)
    {
        _context.Registrations.Update(entity);
        await _context.SaveChangesAsync();
    }
}