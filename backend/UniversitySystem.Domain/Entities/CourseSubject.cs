using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("course_subjects", Schema = "academic")]
public class CourseSubject : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("degree_id")]
    public Guid DegreeId { get; set; }

    [Column("course_id")]
    public Guid CourseId { get; set; }

    [Column("sem_id")]
    public Guid SemId { get; set; }

    [Column("subject_id")]
    public Guid SubjectId { get; set; }
}