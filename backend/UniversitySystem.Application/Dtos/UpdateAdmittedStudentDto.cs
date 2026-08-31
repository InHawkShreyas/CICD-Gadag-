public class UpdateAdmittedStudentDto

{

    public Guid Id { get; set; }

    public bool AdmitYn { get; set; }

    // ✅ NEW

    public string? Remarks { get; set; }

}