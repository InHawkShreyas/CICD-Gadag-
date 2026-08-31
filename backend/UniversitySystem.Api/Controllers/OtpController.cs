using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/otp")]
public class OtpController : ControllerBase
{
    private readonly IOtpService _service;

    public OtpController(IOtpService service)
    {
        _service = service;
    }

    // ✅ SEND OTP
    [HttpPost("send")]
    public async Task<IActionResult> SendOtp(SendOtpRequestDto request)
    {
        var result = await _service.SendOtpAsync(request);
        return Ok(new { success = result });
    }

    // ✅ VERIFY OTP
    [HttpPost("verify")]
    public async Task<IActionResult> VerifyOtp(VerifyOtpRequestDto request)
    {
        var result = await _service.VerifyOtpAsync(request);

        if (!result)
            return BadRequest(new { message = "Invalid or expired OTP" });

        return Ok(new { success = true });
    }

    // ✅ RESEND OTP
    [HttpPost("resend")]
    public async Task<IActionResult> ResendOtp(SendOtpRequestDto request)
    {
        var result = await _service.ResendOtpAsync(request);
        return Ok(new { success = result });    

    }
}