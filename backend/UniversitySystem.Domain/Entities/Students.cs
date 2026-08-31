using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("students", Schema = "academic")]
public class Student : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("student_name")]
    public string StudentName { get; set; } = string.Empty;

    [Column("registration_number")]
    public string RegistrationNumber { get; set; } = string.Empty;

    [Column("degree_id")]
    public Guid DegreeId { get; set; }

    [Column("course_id")]
    public Guid CourseId { get; set; }

    [Column("academic_year")]
    public Guid AcademicYearId { get; set; }
}