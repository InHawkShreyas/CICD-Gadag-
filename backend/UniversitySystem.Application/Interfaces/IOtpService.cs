public interface IOtpService
{
    Task<bool> SendOtpAsync(SendOtpRequestDto request);
    Task<bool> VerifyOtpAsync(VerifyOtpRequestDto request);
    Task<bool> ResendOtpAsync(SendOtpRequestDto request);
}