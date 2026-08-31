public interface IFeeCollectionService
{
    Task<FeeCollectionResponseDto> CreateAsync(CreateFeeCollectionDto dto);

    Task<bool> UpdatePaymentAsync(UpdatePaymentDto dto);

    Task<bool> UpdateRefundAsync(RefundPaymentDto dto);

    Task<FeeCollectionResponseDto?> GetByIdAsync(Guid id);

    Task<List<FeeCollectionResponseDto>> GetAllAsync();

    Task<FeeCollectionResponseDto?> GetByReceiptAndUserAsync(string receiptNumber, string username);

    Task<FeeCollectionResponseDto?> GetByReceiptNumberAsync(string receiptNumber);

    Task<List<FeeCollectionResponseDto>> GetByApplicationIdAsync(Guid applicationId);

    Task<PagedFeeCollectionResult> GetPagedAsync(string? search, List<string>? feeTypes, int page, int pageSize);

    Task<List<string>> GetFeeTypesAsync();
}