using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("receipt_sequence", Schema = "public")]
public class ReceiptSequence
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("prefix")]
    public string Prefix { get; set; } = string.Empty;

    [Column("year")]
    public string Year { get; set; } = string.Empty;

    [Column("last_number")]
    public int LastNumber { get; set; } = 0;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    // 🔽 Audit fields (manual, since not using AuditBase)

    [Column("insert_by")]
    public string? InsertBy { get; set; }

    [Column("insert_on")]
    public DateTime? InsertOn { get; set; }

    [Column("update_by")]
    public string? UpdateBy { get; set; }

    [Column("update_on")]
    public DateTime? UpdateOn { get; set; }
}