public class AdmittedStudentResponseDto

{

    public Guid Id { get; set; }

    public Guid ApplicationId { get; set; }

    public string ApplicationNo { get; set; } = string.Empty;

    public string? Name { get; set; }

    public bool AdmitYn { get; set; }

    // ✅ NEW

    public string? Remarks { get; set; }

}