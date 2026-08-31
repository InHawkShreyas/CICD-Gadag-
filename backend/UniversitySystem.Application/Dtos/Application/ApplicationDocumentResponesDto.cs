public class ApplicationDocumentResponseDto
{
    public Guid Id { get; set; }
    public Guid ApplicationId { get; set; }
    public string? ApplicationNo { get; set; }
    public string DocumentName { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
}