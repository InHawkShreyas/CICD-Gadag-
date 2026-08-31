using Microsoft.EntityFrameworkCore;
using UniversitySystem.Infrastructure.Data;

public class OtpRepository : IOtpRepository
{
    private readonly AppDbContext _context;

    public OtpRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<OtpLog> CreateAsync(OtpLog entity)
    {
        _context.OtpLogs.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<OtpLog?> GetValidOtpAsync(string username, string otp)
    {
        return await _context.OtpLogs
            .Where(x =>
                x.Username == username &&
                x.Otp == otp &&
                x.IsUsed == false &&
                x.Status == true &&
                x.ExpiryTime > DateTime.UtcNow
            )
            .OrderByDescending(x => x.InsertOn)
            .FirstOrDefaultAsync();
    }

    public async Task UpdateAsync(OtpLog entity)
    {
        _context.OtpLogs.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task<List<OtpLog>> GetActiveOtpsByUsernameAsync(string username)

    {

        return await _context.OtpLogs

            .Where(x =>

                x.Username == username &&

                x.IsUsed == false &&

                x.Status == true &&

                x.ExpiryTime > DateTime.UtcNow

            )

            .OrderByDescending(x => x.InsertOn)

            .ToListAsync();

    }
}