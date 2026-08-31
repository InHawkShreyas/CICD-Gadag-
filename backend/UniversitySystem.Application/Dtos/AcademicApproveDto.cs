public class SubjectMarkDto
{
    public Guid SubjectId { get; set; }
    public decimal? IaMarks { get; set; }
    public decimal? AttendancePercentage { get; set; }
}

public class AcademicApproveDto
{
    public List<SubjectMarkDto> SubjectMarks { get; set; } = new();
}
