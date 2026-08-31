public class RegistrationResponseDto
{
    public Guid Id { get; set; }
    public string Username { get; set; }
    public string? Name { get; set; }
    public Guid? NationalityId { get; set; }
    public Guid? DegreeTypeId { get; set; }
    public string? DegreeTypeName { get; set; }
    public string? AcademicYearDescription { get; set; }
    public string? Mobile { get; set; }
    public string? Email { get; set; }
    public string? AadharNo { get; set; }
    public string? PassportNo { get; set; }
    public DateTime? Dob { get; set; }
    public string? UsnNo { get; set; }
    public bool ExamRegistration { get; set; }
}