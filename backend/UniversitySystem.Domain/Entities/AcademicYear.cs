using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("academic_year", Schema = "public")]
public class AcademicYear : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("description")]
    [MaxLength(150)]
    public string? Description { get; set; }

    [Column("batch_year")]
    public string? BatchYear { get; set; }

    [Column("start_date")]
    public DateTime? StartDate { get; set; }

    [Column("end_date")]
    public DateTime? EndDate { get; set; }
}