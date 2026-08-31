using UniversitySystem.Application.Dtos.Application;

public interface IApplicationQueryService
{
    // ✅ STUDENT SELF
    Task<ApplicationFullResponseDto?> GetMyApplicationAsync(string username);

    // ✅ ADMIN / STAFF
    Task<ApplicationFullResponseDto?> GetByAppNoAsync(string appNo);

    // ✅ FILTER
    Task<List<ApplicationFullResponseDto>> FilterAsync(
        ApplicationFilterDto filter
    );

    Task<List<ApplicationFullResponseDto>> GetAllAsync();
    Task<List<DocumentVerificationDto>> GetAllForDocumentVerificationAsync();
}