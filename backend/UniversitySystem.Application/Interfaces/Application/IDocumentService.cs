using Microsoft.AspNetCore.Http;

public interface IApplicationDocumentService
{
    Task CreateAsync(ApplicationDocumentCreateDto dto);
    Task UpdateAsync(ApplicationDocumentUpdateDto dto);
    Task<List<ApplicationDocumentResponseDto>> GetAllAsync();
    Task<ApplicationDocumentResponseDto?> GetByIdAsync(Guid id);
    Task DeleteAsync(Guid id);

    Task<(byte[] fileBytes, string contentType, string fileName)?> GetFileAsync(Guid id);

   Task<List<ApplicationDocumentResponseDto>> GetByApplicationIdAsync(Guid applicationId);
}