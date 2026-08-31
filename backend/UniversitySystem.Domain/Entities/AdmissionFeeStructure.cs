using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("admission_fee_structure", Schema = "fees")]
public class AdmissionFeeStructure : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("fee_id")]
    public Guid? FeeId { get; set; }

    [Column("degree_type_id")]
    public Guid? DegreeTypeId { get; set; }

    [Column("fee_name")]
    public string? FeeName { get; set; }

    [Column("total_amount")]
    public decimal TotalAmount { get; set; }

    [Column("course_id")]
    public Guid? CourseId { get; set; }

    [Column("degree_id")]
    public Guid? DegreeId { get; set; }

    [Column("category_id")]
    public Guid? CategoryId { get; set; }

    [Column("academic_year_id")]
    public Guid? AcademicYearId { get; set; }

    [Column("deduction_yn")]
    public bool DeductionYn { get; set; }

    [Column("annual_income")]
    public Guid? AnnualIncomeId { get; set; }

    [Column("fine_amount")]
    public decimal? FineAmount { get; set; }

    [Column("deduction_amount")]
    public decimal? DeductionAmount { get; set; }

    [Column("start_date")]
    public DateOnly? StartDate { get; set; }

    [Column("end_date")]
    public DateOnly? EndDate { get; set; }

    [Column("fine_end_date")]
    public DateOnly? FineEndDate { get; set; }

    [Column("pay_amount")]
    public decimal? PayAmount { get; set; }

    public ICollection<AdmissionFeeStructureDetail>? Details { get; set; }

}