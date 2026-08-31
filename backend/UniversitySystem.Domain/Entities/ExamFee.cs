using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("exam_fee", Schema = "fees")]
public class ExamFee : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("degree_id")]
    public Guid? DegreeId { get; set; }

    [Column("course_id")]
    public Guid? CourseId { get; set; }

    [Column("academic_year_id")]
    public Guid? AcademicYearId { get; set; }

    [Column("exam_fee_amount")]
    public decimal? ExamFeeAmount { get; set; }

    [Column("start_date")]
    public DateTime? StartDate { get; set; }

    [Column("end_date")]
    public DateTime? EndDate { get; set; }

    [Column("fine_end_date")]
    public DateTime? FineEndDate { get; set; }

    [Column("fine_amount")]
    public decimal? FineAmount { get; set; }

    [Column("platform_charges")]
    public decimal? PlatformCharges { get; set; }

    [Column("total_amount")]
    public decimal? TotalAmount { get; set; }
}