using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("exam_application_details", Schema = "examination")]
public class ExamApplicationDetail : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("exam_application_id")]
    public Guid ExamApplicationId { get; set; }

    [Column("subject_id")]
    public Guid SubjectId { get; set; }

    [Column("attendance_percentage")]
    public decimal? AttendancePercentage { get; set; }

    [Column("ia_marks")]
    public decimal? IaMarks { get; set; }
}