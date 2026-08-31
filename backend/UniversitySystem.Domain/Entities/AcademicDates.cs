using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("academic_dates", Schema = "public")]
public class AcademicDate
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("name")]
    public string? Name { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("start_date")]
    public DateTime? StartDate { get; set; }

    [Column("end_date")]
    public DateTime? EndDate { get; set; }

    [Column("insert_by")]
    public string? InsertBy { get; set; }

    [Column("update_by")]
    public string? UpdateBy { get; set; }

    [Column("insert_on")]
    public DateTime? InsertOn { get; set; }

    [Column("update_on")]
    public DateTime? UpdateOn { get; set; }

    [Column("status")]
    public bool Status { get; set; }
}