public class CreateLoginDto
{
    public string Username { get; set; }
    public string Password { get; set; }
    public Guid RegistrationId { get; set; }
    public Guid RoleId { get; set; } // 🔥 add RoleId to DTO
}

public class LoginSummaryDto
{
    public Guid Id { get; set; }

    public string Username { get; set; } = string.Empty;

    public Guid? RoleId { get; set; }
}