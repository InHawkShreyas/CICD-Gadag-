public class UpdateDegreeDto
{
    public Guid Id { get; set; }
    public Guid UniversityId { get; set; }
    public string DegreeName { get; set; }
    public string? Duration { get; set; }
    public string? Description { get; set; }
    public Guid? DegreeTypeId { get; set; }

}