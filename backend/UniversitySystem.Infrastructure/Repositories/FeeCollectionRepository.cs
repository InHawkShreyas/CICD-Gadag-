using Microsoft.EntityFrameworkCore;
using UniversitySystem.Domain.Interfaces;
using UniversitySystem.Domain.Utils;
using UniversitySystem.Infrastructure.Data;

public class FeeCollectionRepository : IFeeCollectionRepository
{
    private readonly AppDbContext _context;

    public FeeCollectionRepository(AppDbContext context)
    {
        _context = context;
    }

    // ✅ CREATE (Before payment)
    public async Task<FeeCollection> CreateAsync(FeeCollection entity)
    {
        try
        {
            _context.FeeCollections.Add(entity);
            await _context.SaveChangesAsync();
            return entity;
        }
        catch (Exception ex)
        {
            throw new Exception(
                ex.InnerException?.Message ?? ex.Message
            );
        }
    }

    // ✅ UPDATE (After payment)
    public async Task UpdateAsync(FeeCollection entity)
    {
        try
        {
            _context.FeeCollections.Update(entity);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            throw new Exception(
                ex.InnerException?.Message ?? ex.Message
            );
        }
    }

    public async Task<FeeCollection?> GetByIdAsync(Guid id)
    {
        return await _context.FeeCollections
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<List<FeeCollection>> GetAllAsync()
    {
        return await _context.FeeCollections
            .AsNoTracking()
            .OrderByDescending(x => x.InsertOn)
            .ToListAsync();
    }

    public async Task<FeeCollection?> GetByReceiptNumberAsync(string receiptNumber)
    {
        return await _context.FeeCollections
            .FirstOrDefaultAsync(x => x.ReceiptNumber == receiptNumber);
    }

    public async Task<FeeCollection?> GetByReceiptAndUserAsync(string receiptNumber, string username)
    {
        return await _context.FeeCollections
            .FirstOrDefaultAsync(x =>
                x.ReceiptNumber == receiptNumber &&
                x.InsertBy == username
            );
    }

    public async Task<List<FeeCollection>> GetByApplicationIdAsync(Guid applicationId)
    {
        return await _context.FeeCollections
            .AsNoTracking()
            .Where(x => x.ApplicationId == applicationId)
            .OrderByDescending(x => x.InsertOn)
            .ToListAsync();
    }

    public async Task<int> CountAttemptsSinceAsync(Guid applicationId, string feeType, DateTime since)
    {
        return await _context.FeeCollections
            .AsNoTracking()
            .Where(x =>
                x.ApplicationId == applicationId &&
                x.FeeType == feeType &&
                x.InsertOn != null &&
                x.InsertOn >= since
            )
            .CountAsync();
    }

    public async Task<(List<Guid> ApplicationIds, int TotalGroups)> GetPagedApplicationIdsAsync(
        string? search, List<string>? feeTypes, int page, int pageSize)
    {
        var filtered = BuildFilteredQuery(search, feeTypes);

        var grouped = filtered
            .GroupBy(x => x.ApplicationId)
            .Select(g => new
            {
                ApplicationId = g.Key,
                LatestActivity = g.Max(x => x.PaymentDate ?? x.InsertOn)
            });

        var totalGroups = await grouped.CountAsync();

        var pagedIds = await grouped
            .OrderByDescending(g => g.LatestActivity)
            .Skip((Math.Max(page, 1) - 1) * pageSize)
            .Take(pageSize)
            .Select(g => g.ApplicationId)
            .ToListAsync();

        return (pagedIds, totalGroups);
    }

    public async Task<List<FeeCollection>> GetByApplicationIdsAsync(List<Guid> applicationIds)
    {
        if (applicationIds.Count == 0) return new List<FeeCollection>();

        return await _context.FeeCollections
            .AsNoTracking()
            .Where(x => applicationIds.Contains(x.ApplicationId))
            .OrderByDescending(x => x.InsertOn)
            .ToListAsync();
    }

    public async Task<FeeTotals> GetTotalsAsync(string? search, List<string>? feeTypes)
    {
        var successOnly = BuildFilteredQuery(search, feeTypes)
            .Where(x => x.Status == "SUCCESS");

        var totals = await successOnly
            .GroupBy(x => 1)
            .Select(g => new FeeTotals
            {
                Total = g.Sum(x => x.PaidAmount ?? 0),
                ApplicationFees = g
                    .Where(x => x.FeeType != null && x.FeeType.ToLower().Contains("application"))
                    .Sum(x => x.PaidAmount ?? 0),
                AdmissionFees = g
                    .Where(x => x.FeeType != null && x.FeeType.ToLower().Contains("admission"))
                    .Sum(x => x.PaidAmount ?? 0),
            })
            .FirstOrDefaultAsync();

        return totals ?? new FeeTotals();
    }

    public async Task<List<string>> GetDistinctFeeTypesAsync()
    {
        return await _context.FeeCollections
            .AsNoTracking()
            .Where(x => x.FeeType != null)
            .Select(x => x.FeeType!)
            .Distinct()
            .ToListAsync();
    }

    private IQueryable<FeeCollection> BuildFilteredQuery(string? search, List<string>? feeTypes)
    {
        var query = _context.FeeCollections.AsNoTracking().AsQueryable();

        if (feeTypes is { Count: > 0 })
            query = query.Where(x => x.FeeType != null && feeTypes.Contains(x.FeeType));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(x =>
                (x.ApplicationNo != null && x.ApplicationNo.ToLower().Contains(s)) ||
                (x.Name != null && x.Name.ToLower().Contains(s)) ||
                (x.ReceiptNumber != null && x.ReceiptNumber.ToLower().Contains(s)) ||
                (x.TransactionId != null && x.TransactionId.ToLower().Contains(s)));
        }

        return query;
    }
}