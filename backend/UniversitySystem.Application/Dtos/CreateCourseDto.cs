public class CreateCourseDto
{
    public Guid DegreeId { get; set; }
    public string Name { get; set; }
    public string? Code { get; set; }
    public int TotalSeats { get; set; }
}