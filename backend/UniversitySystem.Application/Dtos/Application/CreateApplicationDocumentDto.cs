using Microsoft.AspNetCore.Http;

public class ApplicationDocumentCreateDto
{
    public string ApplicationNo { get; set; } = string.Empty; // ✅ from frontend

    public string DocumentName { get; set; } = string.Empty;

    public IFormFile? File { get; set; }
}