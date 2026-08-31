public class CreateDegreeDto
{
    public Guid UniversityId { get; set; }   // 🔥 from frontend
    public string DegreeName { get; set; }
    public string? Duration { get; set; }
    public string? Description { get; set; }
    public Guid? DegreeTypeId { get; set; }

}