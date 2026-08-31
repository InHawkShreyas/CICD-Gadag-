public interface IApplicationVerificationService
{
    Task<ApplicationVerificationResponseDto> CreateAsync(CreateApplicationVerificationDto dto);

    Task<bool> UpdateAsync(UpdateApplicationVerificationDto dto);

    Task<List<ApplicationVerificationResponseDto>> GetAllAsync();

    Task<ApplicationVerificationResponseDto?> GetByIdAsync(Guid id);

    Task<ApplicationVerificationResponseDto?> GetByAppNoAsync(string appNo);

    Task<bool> DeleteAsync(Guid id);
}