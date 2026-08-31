public class ExamApplicationDetailDto
{
    public Guid Id { get; set; }
    public Guid ExamApplicationId { get; set; }
    public Guid SubjectId { get; set; }
    public decimal? AttendancePercentage { get; set; }
    public decimal? IaMarks { get; set; }
}
