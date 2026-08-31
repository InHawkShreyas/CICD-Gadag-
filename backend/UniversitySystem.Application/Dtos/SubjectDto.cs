public class SubjectDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public decimal MaxMarks { get; set; }

    public decimal MinMarks { get; set; }
}