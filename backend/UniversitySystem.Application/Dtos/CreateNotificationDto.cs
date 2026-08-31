using Microsoft.AspNetCore.Http;

public class CreateNotificationDto
{
    public string Title { get; set; }
    public string? Description { get; set; }
    public IFormFile? File { get; set; } // 🔥 FILE

}