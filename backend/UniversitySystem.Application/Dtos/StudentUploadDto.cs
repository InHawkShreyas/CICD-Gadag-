using Microsoft.AspNetCore.Http;

public class StudentUploadDto
{
    public Guid DegreeId { get; set; }
    public Guid CourseId { get; set; }
    public Guid AcademicYearId { get; set; }

    public IFormFile File { get; set; } = default!;
}