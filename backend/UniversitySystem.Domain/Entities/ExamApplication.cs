using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("exam_application", Schema = "examination")]
public class ExamApplication : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("application_no")]
    [MaxLength(50)]
    public string ApplicationNo { get; set; } = string.Empty;

    [Column("sem_id")]
    public Guid SemId { get; set; }

    [Column("academic_year_id")]
    public Guid AcademicYearId { get; set; }

    [Column("academic_approval")]
    public bool AcademicApproval { get; set; }

    [Column("attendance_approval")]
    public bool AttendanceApproval { get; set; }

    [Column("other_approval")]
    public bool OtherApproval { get; set; }

    [Column("name")]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Column("regis_number")]
    [MaxLength(100)]
    public string RegisNumber { get; set; } = string.Empty;

    [Column("degree_id")]
    public Guid DegreeId { get; set; }

    [Column("course_id")]
    public Guid CourseId { get; set; }

    [Column("mobile")]
    [MaxLength(15)]
    public string? Mobile { get; set; }

    [Column("email")]
    [MaxLength(200)]
    public string? Email { get; set; }

    [Column("declaration_yn")]
    public bool? DeclarationYn { get; set; }
}