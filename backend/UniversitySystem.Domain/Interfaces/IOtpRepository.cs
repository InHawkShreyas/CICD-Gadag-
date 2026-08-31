public interface IOtpRepository
{
    Task<OtpLog> CreateAsync(OtpLog entity);
    Task<OtpLog?> GetValidOtpAsync(string username, string otp);
    Task UpdateAsync(OtpLog entity);
    Task<List<OtpLog>> GetActiveOtpsByUsernameAsync(string username);
}