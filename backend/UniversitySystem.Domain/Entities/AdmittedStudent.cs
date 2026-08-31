using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("admitted_students", Schema = "academic")]
public class AdmittedStudent
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("application_id")]
    public Guid ApplicationId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("application_no")]
    public string ApplicationNo { get; set; } = string.Empty;

    [MaxLength(150)]
    [Column("name")]
    public string? Name { get; set; }

    [Column("admit_yn")]
    public bool AdmitYn { get; set; }

    // ✅ FIX: DB column is "remark" (not "remarks")
    [MaxLength(255)]
    [Column("remark")]
    public string? Remarks { get; set; }

    [MaxLength(100)]
    [Column("insert_by")]
    public string? InsertBy { get; set; }

    [MaxLength(100)]
    [Column("update_by")]
    public string? UpdateBy { get; set; }

    [Column("insert_on")]
    public DateTime InsertOn { get; set; }

    [Column("update_on")]
    public DateTime? UpdateOn { get; set; }
}