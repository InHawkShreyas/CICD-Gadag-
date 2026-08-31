using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class LoginRepository : ILoginRepository
{
    private readonly AppDbContext _context;

    public LoginRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Login> CreateAsync(Login entity)
    {
        _context.Logins.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<Login?> GetByUsernameAsync(string username)
    {
        return await _context.Logins
            .FirstOrDefaultAsync(x => x.Username == username && x.Status == true);
    }

    public async Task UpdateAsync(Login entity)
    {
        _context.Logins.Update(entity);
        await _context.SaveChangesAsync();
    }
    public async Task<Login?> GetProfileByUsernameAsync(string username)
    {
        return await _context.Logins
            .FirstOrDefaultAsync(x => x.Username == username && x.Status == true);
    }

    public async Task<bool> UpdateRoleByUsernameAsync(string username, Guid roleId)
    {
        var user = await _context.Logins
            .FirstOrDefaultAsync(x => x.Username == username && x.Status == true);

        if (user == null)
            return false;

        user.RoleId = roleId;

        // optional audit
        user.UpdateOn = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ExistsByRegistrationIdAsync(Guid registrationId)
    {
        return await _context.Logins
            .AsNoTracking()
            .AnyAsync(l => l.RegistrationId == registrationId && l.Status == true);
    }
    public async Task<IEnumerable<Login>> GetByRoleIdAsync(Guid roleId)
    {
        return await _context.Logins
            .Where(l => l.RoleId == roleId && l.Status == true)
            .ToListAsync();
    }
}