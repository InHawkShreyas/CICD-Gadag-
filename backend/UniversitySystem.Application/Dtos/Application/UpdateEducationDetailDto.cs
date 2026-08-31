public class UpdateEducationDetailDto
{
    public Guid Id { get; set; }

    public string ExamName { get; set; } = string.Empty;
    public string? AppNo { get; set; }

    public decimal? MaxMarks { get; set; }
    public decimal? ObtainedMarks { get; set; }

    public string? RegistrationNumber { get; set; }

    public decimal? Percentage { get; set; }
    public decimal? CGPA { get; set; }

    public int? year { get; set; }
}