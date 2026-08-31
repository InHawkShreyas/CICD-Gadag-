public class ApplicationPhotoResponseDto
{
    public Guid Id { get; set; }
    public Guid ApplicationId { get; set; }
    public string? AppNo { get; set; }

    public string? PhotoUrl { get; set; }
    public string? SignatureUrl { get; set; }
    public string? ParentSignUrl { get; set; }
}