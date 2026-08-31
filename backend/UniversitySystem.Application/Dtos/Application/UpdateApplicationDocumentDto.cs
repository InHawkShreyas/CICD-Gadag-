using Microsoft.AspNetCore.Http;

public class ApplicationDocumentUpdateDto
{
    public Guid Id { get; set; }
    public string DocumentName { get; set; } = string.Empty;

    public IFormFile? File { get; set; }
}