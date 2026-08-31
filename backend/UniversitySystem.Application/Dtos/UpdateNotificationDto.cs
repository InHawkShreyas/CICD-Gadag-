
using Microsoft.AspNetCore.Http;

public class UpdateNotificationDto
{
    public Guid Id { get; set; }
    public string Title { get; set; }
    public string? Description { get; set; }
    public IFormFile? File { get; set; } 
   
}