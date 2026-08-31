using KVFSU.Application.Interfaces.Common;

public class OtpService : IOtpService
{
    private readonly IOtpRepository _repo;
    private readonly ISmsService _smsService;

    public OtpService(IOtpRepository repo, ISmsService smsService)
    {
        _repo = repo;
        _smsService = smsService;
    }

    // =====================================================
    // SEND OTP
    // =====================================================

    public async Task<bool> SendOtpAsync(SendOtpRequestDto request)
    {
        var otp = GenerateOtp();

        var entity = new OtpLog
        {
            Username = request.Username,
            Mobile = request.Mobile,
            Otp = otp,
            IsUsed = false,
            ExpiryTime = DateTime.UtcNow.AddMinutes(10),
            InsertOn = DateTime.UtcNow,
            Status = true
        };

        await _repo.CreateAsync(entity);

        await _smsService.SendOtpAsync(request.Mobile, otp, 10);

        return true;
    }

    // =====================================================
    // RESEND OTP
    // =====================================================

    public async Task<bool> ResendOtpAsync(SendOtpRequestDto request)
    {
        // 🔥 expire old unused OTPs
        var existingOtps = await _repo.GetActiveOtpsByUsernameAsync(request.Username);

        foreach (var otp in existingOtps)
        {
            otp.IsUsed = true;

            otp.ExpiryTime = DateTime.SpecifyKind(
                otp.ExpiryTime,
                DateTimeKind.Utc
            );

            otp.InsertOn = DateTime.SpecifyKind(
                otp.InsertOn,
                DateTimeKind.Utc
            );

            await _repo.UpdateAsync(otp);
        }

        // 🔥 generate new OTP
        var newOtp = GenerateOtp();

        var entity = new OtpLog
        {
            Username = request.Username,
            Mobile = request.Mobile,
            Otp = newOtp,
            IsUsed = false,
            ExpiryTime = DateTime.UtcNow.AddMinutes(10),
            InsertOn = DateTime.UtcNow,
            Status = true
        };

        await _repo.CreateAsync(entity);

        // 🔥 resend SMS
        await _smsService.SendOtpAsync(request.Mobile, newOtp, 10);

        return true;
    }

    // =====================================================
    // VERIFY OTP
    // =====================================================

    public async Task<bool> VerifyOtpAsync(VerifyOtpRequestDto request)
    {
        var otpRecord = await _repo.GetValidOtpAsync(
            request.Username,
            request.Otp
        );

        if (otpRecord == null)
            return false;

        otpRecord.IsUsed = true;

        otpRecord.ExpiryTime = DateTime.SpecifyKind(
            otpRecord.ExpiryTime,
            DateTimeKind.Utc
        );

        otpRecord.InsertOn = DateTime.SpecifyKind(
            otpRecord.InsertOn,
            DateTimeKind.Utc
        );

        await _repo.UpdateAsync(otpRecord);

        return true;
    }

    // =====================================================
    // HELPER
    // =====================================================

    private string GenerateOtp()
    {
        return new Random()
            .Next(100000, 999999)
            .ToString();
    }
}