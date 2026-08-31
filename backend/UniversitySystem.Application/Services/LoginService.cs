using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using UniversitySystem.Application.Dtos;

public class LoginService : ILoginService
{
    private readonly ILoginRepository _repo;
    private readonly JwtSettings _jwt;
    private readonly IRegistrationService _registrationService;
    private readonly IOtpService _otpService;

    public LoginService(
        ILoginRepository repo,
        IOptions<JwtSettings> jwt,
        IRegistrationService registrationService,
        IOtpService otpService)
    {
        _repo = repo;
        _jwt = jwt.Value;
        _registrationService = registrationService;
        _otpService = otpService;
    }

    // 🔐 HASH PASSWORD
    private string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(password);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    // ✅ CREATE PASSWORD
    public async Task<bool> CreatePasswordAsync(CreateLoginDto dto)
    {
        var existing = await _repo.GetByUsernameAsync(dto.Username);

        if (existing != null)
            return false;

        var entity = new Login
        {
            Username = dto.Username,
            PasswordHash = HashPassword(dto.Password),
            RegistrationId = dto.RegistrationId,
            RoleId = dto.RoleId,
            LastPasswordChange = DateTime.UtcNow,
            Status = true
        };

        await _repo.CreateAsync(entity);
        return true;
    }

    // 🔥 LOGIN (FIXED PROPERLY)
    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto dto, string? ipAddress)
    {
        Console.WriteLine("🔍 Login started");

        var user = await _repo.GetByUsernameAsync(dto.Username);

        if (user == null)
        {
            Console.WriteLine("❌ User not found");
            return new LoginResponseDto { Success = false };
        }

        var hash = HashPassword(dto.Password);

        if (user.PasswordHash != hash)
        {
            Console.WriteLine("❌ Invalid password");
            return new LoginResponseDto { Success = false };
        }

        // ⚠️ IMPORTANT FIX: DO NOT UPDATE DB DURING LOGIN
        // ❌ REMOVE THIS (causes DB lock / hanging)
        // user.IpAddress = ipAddress;
        // await _repo.UpdateAsync(user);

        Console.WriteLine("✅ User validated");

        // 🔥 Claims
        var claims = new List<Claim>
        {
            new Claim("username", user.Username)
        };

        if (user.RoleId != null)
            claims.Add(new Claim("roleId", user.RoleId.ToString()));

        // 🔐 Token
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes),
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        Console.WriteLine("🚀 Login completed");

        return new LoginResponseDto
        {
            Success = true,
            Token = tokenString,
            Username = user.Username,
            RoleId = user.RoleId
        };
    }

    // 🔄 RESET PASSWORD
    public async Task<bool> ResetPasswordAsync(ForgotPasswordDto dto)
    {
        var user = await _repo.GetByUsernameAsync(dto.Username);

        if (user == null)
            return false;

        user.PasswordHash = HashPassword(dto.NewPassword);
        user.LastPasswordChange = DateTime.UtcNow;

        await _repo.UpdateAsync(user);

        return true;
    }

    // 👤 GET PROFILE
    public async Task<LoginProfileDto?> GetProfileAsync(string username)
    {
        var user = await _repo.GetProfileByUsernameAsync(username);

        if (user == null)
            return null;

        return new LoginProfileDto
        {
            Username = user.Username,
            RoleId = user.RoleId,
            IpAddress = user.IpAddress
        };
    }

    // 🔄 UPDATE ROLE
    public async Task<bool> UpdateUserRoleAsync(UpdateRoleRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
            throw new ArgumentException("Username is required");

        if (request.RoleId == Guid.Empty)
            throw new ArgumentException("RoleId is required");

        return await _repo.UpdateRoleByUsernameAsync(request.Username, request.RoleId);
    }

    // Human-readable label for error/status messages ("Aadhaar number" / "Passport number").
    private static string DescribeIdType(string idType) =>
        string.Equals(idType, "passport", StringComparison.OrdinalIgnoreCase)
            ? "Passport number"
            : "Aadhaar number";

    // ============================================================
    // 🔎 FORGOT USERNAME
    // NOTE: add these 3 signatures to ILoginService too:
    //   Task<ForgotUsernameResultDto> SendUsernameOtpAsync(CheckAadharMobileRequestDto dto);
    //   Task<ForgotUsernameResultDto> ResendUsernameOtpAsync(CheckAadharMobileRequestDto dto);
    //   Task<ForgotUsernameResultDto> VerifyUsernameOtpAsync(VerifyUsernameOtpRequestDto dto);
    // ============================================================

    // STEP 1 — verify Aadhaar/Passport + Mobile belong to the same registration, then send OTP.
    // The real username isn't known yet, so the OTP record is keyed on the mobile
    // number itself (OtpService just needs a stable identifier to send/verify against).
    public async Task<ForgotUsernameResultDto> SendUsernameOtpAsync(CheckAadharMobileRequestDto dto)
    {
        var identityCheck = await _registrationService.FindByIdentityAndMobileAsync(dto.IdType, dto.IdNumber, dto.Mobile);
        var exists = identityCheck.Exists;

        if (!exists)
        {
            return new ForgotUsernameResultDto
            {
                Success = false,
                Message = $"No account found with this {DescribeIdType(dto.IdType)} and mobile number."
            };
        }

        await _otpService.SendOtpAsync(new SendOtpRequestDto
        {
            Username = dto.Mobile.Trim(),
            Mobile = dto.Mobile.Trim()
        });

        return new ForgotUsernameResultDto
        {
            Success = true,
            Message = "OTP sent to your registered mobile number."
        };
    }

    // RESEND
    public async Task<ForgotUsernameResultDto> ResendUsernameOtpAsync(CheckAadharMobileRequestDto dto)
    {
        var identityCheck = await _registrationService.FindByIdentityAndMobileAsync(dto.IdType, dto.IdNumber, dto.Mobile);
        var exists = identityCheck.Exists;

        if (!exists)
        {
            return new ForgotUsernameResultDto
            {
                Success = false,
                Message = $"No account found with this {DescribeIdType(dto.IdType)} and mobile number."
            };
        }

        await _otpService.ResendOtpAsync(new SendOtpRequestDto
        {
            Username = dto.Mobile.Trim(),
            Mobile = dto.Mobile.Trim()
        });

        return new ForgotUsernameResultDto
        {
            Success = true,
            Message = "OTP resent to your registered mobile number."
        };
    }

    // STEP 2 — verify OTP, then look up and return the username for on-screen display.
    public async Task<ForgotUsernameResultDto> VerifyUsernameOtpAsync(VerifyUsernameOtpRequestDto dto)
    {
        var otpValid = await _otpService.VerifyOtpAsync(new VerifyOtpRequestDto
        {
            Username = dto.Mobile.Trim(),
            Otp = dto.Otp.Trim()
        });

        if (!otpValid)
        {
            return new ForgotUsernameResultDto
            {
                Success = false,
                Message = "Invalid or expired OTP. Please try again."
            };
        }

        // Re-check identity (defense in depth — the OTP itself is only keyed on mobile number).
        var identityCheck = await _registrationService.FindByIdentityAndMobileAsync(dto.IdType, dto.IdNumber, dto.Mobile);
        var exists = identityCheck.Exists;
        var loginCompleted = identityCheck.LoginCompleted;
        var username = identityCheck.Username;

        if (!exists || string.IsNullOrEmpty(username))
        {
            return new ForgotUsernameResultDto
            {
                Success = false,
                Message = $"No account found with this {DescribeIdType(dto.IdType)} and mobile number."
            };
        }

        if (!loginCompleted)
        {
            return new ForgotUsernameResultDto
            {
                Success = false,
                Message = "Registration is not complete yet — no username has been created."
            };
        }

        return new ForgotUsernameResultDto
        {
            Success = true,
            Message = "Username retrieved successfully.",
            Username = username
        };
    }

    public async Task<IEnumerable<LoginSummaryDto>> GetLoginsByRoleIdAsync(Guid roleId)
    {
        var logins = await _repo.GetByRoleIdAsync(roleId);

        return logins.Select(l => new LoginSummaryDto
        {
            Id = l.Id,
            Username = l.Username,
            RoleId = l.RoleId
        });
    }
}