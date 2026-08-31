public class UpdateAcademicYearDto
{
    public Guid Id { get; set; }
    public string? Description { get; set; }
    public string? BatchYear { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}