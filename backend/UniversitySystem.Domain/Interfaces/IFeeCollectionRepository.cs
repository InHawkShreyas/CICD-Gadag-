using UniversitySystem.Domain.Utils;

public interface IFeeCollectionRepository
{
    Task<FeeCollection> CreateAsync(FeeCollection entity);

    Task UpdateAsync(FeeCollection entity);

    Task<FeeCollection?> GetByIdAsync(Guid id);

    Task<List<FeeCollection>> GetAllAsync();

    Task<FeeCollection?> GetByReceiptNumberAsync(string receiptNumber);

    Task<FeeCollection?> GetByReceiptAndUserAsync(string receiptNumber, string username);

    Task<List<FeeCollection>> GetByApplicationIdAsync(Guid applicationId);

    Task<int> CountAttemptsSinceAsync(Guid applicationId, string feeType, DateTime since);
    Task<(List<Guid> ApplicationIds, int TotalGroups)> GetPagedApplicationIdsAsync(
           string? search, List<string>? feeTypes, int page, int pageSize);
    Task<List<FeeCollection>> GetByApplicationIdsAsync(List<Guid> applicationIds);
    Task<FeeTotals> GetTotalsAsync(string? search, List<string>? feeTypes);
    Task<List<string>> GetDistinctFeeTypesAsync();
}