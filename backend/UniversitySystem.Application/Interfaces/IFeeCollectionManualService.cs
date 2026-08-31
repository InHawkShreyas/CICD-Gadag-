using UniversitySystem.Application.DTOs.FeeCollectionManualDtos;

public interface IFeeCollectionManualService
{
    // ✅ CREATE
    Task<FeeCollectionManualResponseDto> CreateAsync(
        CreateFeeCollectionManualDto dto
    );

    // ✅ GET ALL
    Task<List<FeeCollectionManualResponseDto>> GetAllAsync();

    // ✅ GET PAGED
    Task<PagedFeeCollectionManualResult> GetPagedAsync(int page, int pageSize);

    // ✅ GET BY ID
    Task<FeeCollectionManualResponseDto?> GetByIdAsync(Guid id);

    // ✅ GET BY APP NO
    Task<List<FeeCollectionManualResponseDto>> GetByAppNoAsync(string appNo);

    // ✅ UPDATE
    Task UpdateAsync(Guid id, UpdateFeeCollectionManualDto dto);
}