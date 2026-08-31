public class UpdateCourseDto
{
    public Guid Id { get; set; }
    public Guid DegreeId { get; set; }
    public string Name { get; set; }
    public string? Code { get; set; }
    public int TotalSeats { get; set; }
    public decimal ApplicationFee { get; set; }
     
}