using Microsoft.AspNetCore.Mvc;
using KVFSU.Application.Interfaces.Common;
using Microsoft.AspNetCore.Authorization;

[ApiController]
[Authorize]
[Route("api/sms")]
public class SmsController : ControllerBase
{
    private readonly ISmsService _smsService;

    public SmsController(ISmsService smsService)
    {
        _smsService = smsService;
    }

    // ✅ TEST: Send Custom SMS
    [HttpPost("send")]
    public async Task<IActionResult> SendSms(string mobile, string message)
    {
        var result = await _smsService.SendSmsAsync(mobile, message);

        if (!result)
            return BadRequest("Failed to send SMS");

        return Ok("SMS sent successfully");
    }

    // ✅ TEST: Send OTP
    [HttpPost("send-otp")]
    public async Task<IActionResult> SendOtp(string mobile)
    {
        var otp = new Random().Next(100000, 999999).ToString();

        var result = await _smsService.SendOtpAsync(mobile, otp, 5);

        if (!result)
            return BadRequest("Failed to send OTP");

        return Ok(new
        {
            Message = "OTP sent successfully",
            Otp = otp // ⚠️ Only for testing (REMOVE in production)
        });
    }
}