using Microsoft.AspNetCore.Mvc;
using UniversitySystem.Application.Dtos;

[ApiController]
[Route("api/login")]
public class LoginController : ControllerBase
{
    private readonly ILoginService _service;

    public LoginController(ILoginService service)
    {
        _service = service;
    }

    // 🔥 SET PASSWORD (after registration)
    [HttpPost("set-password")]
    public async Task<IActionResult> CreatePassword(CreateLoginDto dto)
    {
        var result = await _service.CreatePasswordAsync(dto);

        if (!result)
            return BadRequest(new { message = "Unable to set password. Please contact support." });

        return Ok(new { success = true });
    }

    // 🔥 LOGIN
    [HttpPost]
    public async Task<IActionResult> Login(LoginRequestDto dto)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _service.LoginAsync(dto, ip);

        if (!result.Success)
            return Unauthorized(new { message = "Invalid credentials" });

        return Ok(result);
    }
    // 🔥 FORGOT PASSWORD
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ForgotPasswordDto dto)
    {
        var result = await _service.ResetPasswordAsync(dto);

        if (!result)
            return BadRequest(new { message = "User not found" });

        return Ok(new { success = true });
    }
    // 👤 GET PROFILE
    [HttpGet("{username}")]
    public async Task<IActionResult> GetProfile(string username)
    {
        var result = await _service.GetProfileAsync(username);

        if (result == null)
            return NotFound(new { message = "User not found" });

        return Ok(result);
    }

    [HttpPost("update-role")]
    public async Task<IActionResult> UpdateRole([FromBody] UpdateRoleRequestDto request)
    {
        var result = await _service.UpdateUserRoleAsync(request);

        if (!result)
        {
            return NotFound(new
            {
                success = false,
                message = "User not found"
            });
        }

        return Ok(new
        {
            success = true,
            message = "Role updated successfully"
        });
    }

    // ============================================================
    // 🔎 FORGOT USERNAME
    // ============================================================

    // STEP 1 — verify Aadhaar + Mobile, send OTP
    [HttpPost("forgot-username/send-otp")]
    public async Task<IActionResult> SendUsernameOtp([FromBody] CheckAadharMobileRequestDto dto)
    {
        var result = await _service.SendUsernameOtpAsync(dto);
        return Ok(result);
    }

    // RESEND
    [HttpPost("forgot-username/resend-otp")]
    public async Task<IActionResult> ResendUsernameOtp([FromBody] CheckAadharMobileRequestDto dto)
    {
        var result = await _service.ResendUsernameOtpAsync(dto);
        return Ok(result);
    }

    // STEP 2 — verify OTP, get username, SMS it
    [HttpPost("forgot-username/verify-otp")]
    public async Task<IActionResult> VerifyUsernameOtp([FromBody] VerifyUsernameOtpRequestDto dto)
    {
        var result = await _service.VerifyUsernameOtpAsync(dto);
        return Ok(result);
    }

    [HttpGet("by-role/{roleId}")]
    public async Task<ActionResult<IEnumerable<LoginSummaryDto>>> GetByRoleId(Guid roleId)
    {
        var logins = await _service.GetLoginsByRoleIdAsync(roleId);
        return Ok(logins);
    }
}