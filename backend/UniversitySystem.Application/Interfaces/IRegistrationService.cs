public interface IRegistrationService
{
    Task<RegistrationResponseDto> CreateAsync(RegistrationRequestDto request);
    Task<RegistrationResponseDto?> GetByUsernameAsync(string username);
    Task<List<RegistrationResponseDto>> GetAllAsync();
    Task SoftDeleteAsync(string username);
    Task UpdateExamRegistrationAsync(string username, bool examRegistration);
    Task<IdentityCheckResultDto> CheckIdentityStatusAsync(string documentType, string value);
    Task<RegistrationResponseDto> ResumeIncompleteAsync(string existingUsername, RegistrationRequestDto request);
    Task<(bool Exists, bool LoginCompleted, string? Username)> FindByIdentityAndMobileAsync(string idType, string idNumber, string mobile);
}