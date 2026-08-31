namespace KVFSU.Application.Interfaces.Common
{
    public interface ISmsService
    {
        Task<bool> SendOtpAsync(string mobile, string otp, int validMinutes);
        Task<bool> SendSmsAsync(string mobile, string message);
    }
}