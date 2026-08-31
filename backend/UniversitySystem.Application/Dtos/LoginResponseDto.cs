public class LoginResponseDto
{
    public bool Success { get; set; }
    public string? Token { get; set; }
    public string? Username { get; set; }
    public Guid? RoleId { get; set; }
}