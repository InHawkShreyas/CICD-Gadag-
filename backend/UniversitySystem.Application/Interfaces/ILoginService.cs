using UniversitySystem.Application.Dtos;

public interface ILoginService
{
    Task<bool> CreatePasswordAsync(CreateLoginDto dto);
    Task<LoginResponseDto> LoginAsync(LoginRequestDto dto, string? ipAddress);
    Task<bool> ResetPasswordAsync(ForgotPasswordDto dto);
    Task<bool> UpdateUserRoleAsync(UpdateRoleRequestDto request);
    Task<LoginProfileDto?> GetProfileAsync(string username);
    Task<ForgotUsernameResultDto> SendUsernameOtpAsync(CheckAadharMobileRequestDto dto);
    Task<ForgotUsernameResultDto> ResendUsernameOtpAsync(CheckAadharMobileRequestDto dto);
    Task<ForgotUsernameResultDto> VerifyUsernameOtpAsync(VerifyUsernameOtpRequestDto dto);
    Task<IEnumerable<LoginSummaryDto>> GetLoginsByRoleIdAsync(Guid roleId);
}