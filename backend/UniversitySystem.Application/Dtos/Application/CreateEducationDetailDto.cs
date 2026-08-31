public class CreateEducationDetailDto
{
    public Guid ApplicationId { get; set; }   // 🔥 from Application
    public string? AppNo { get; set; }        // 🔥 from Application

    public string ExamName { get; set; } = string.Empty;

    public decimal? MaxMarks { get; set; }
    public decimal? ObtainedMarks { get; set; }

    public string? RegistrationNumber { get; set; }

    public decimal? Percentage { get; set; }
    public decimal? CGPA { get; set; }

    public int? year { get; set; }
}