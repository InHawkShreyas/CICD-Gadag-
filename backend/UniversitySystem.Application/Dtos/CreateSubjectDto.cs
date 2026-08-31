using System.ComponentModel.DataAnnotations;

public class CreateSubjectDto
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Code { get; set; } = string.Empty;

    public decimal MaxMarks { get; set; }

    public decimal MinMarks { get; set; }
}