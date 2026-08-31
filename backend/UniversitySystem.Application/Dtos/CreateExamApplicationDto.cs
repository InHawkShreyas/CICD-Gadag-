public class CreateExamApplicationDto
{
    public string Name { get; set; } = string.Empty;

    public string RegisNumber { get; set; } = string.Empty;

    public Guid DegreeId { get; set; }

    public Guid CourseId { get; set; }

    public Guid SemId { get; set; }

    public Guid AcademicYearId { get; set; }

    public string? Mobile { get; set; }

    public string? Email { get; set; }
    public bool? DeclarationYn { get; set; }
    public int SemesterNumber { get; set; }

    public List<Guid> SubjectIds { get; set; } = [];
}