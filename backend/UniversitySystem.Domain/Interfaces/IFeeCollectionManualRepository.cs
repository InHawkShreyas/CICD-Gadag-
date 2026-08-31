using UniversitySystem.Domain.Entities;

public interface IFeeCollectionManualRepository
{
    // ✅ CREATE
    Task<FeeCollectionManual> CreateAsync(FeeCollectionManual entity);

    // ✅ GET ALL
    Task<List<FeeCollectionManual>> GetAllAsync();

    // ✅ GET PAGED
    Task<(List<FeeCollectionManual> Items, int TotalCount)> GetPagedAsync(int page, int pageSize);

    // ✅ GET BY ID
    Task<FeeCollectionManual?> GetByIdAsync(Guid id);

    // ✅ GET BY APPLICATION NUMBER
    Task<List<FeeCollectionManual>> GetByAppNoAsync(string appNo);

    // ✅ UPDATE
    Task UpdateAsync(FeeCollectionManual entity);
}