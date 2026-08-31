public class CreateAdmittedStudentDto
{
    public Guid ApplicationId { get; set; }
    public string ApplicationNo { get; set; } = string.Empty;
    public string? Name { get; set; }

    // ✅ ADD THIS
    public bool AdmitYn { get; set; } = true;

    public string? Remarks { get; set; }
}