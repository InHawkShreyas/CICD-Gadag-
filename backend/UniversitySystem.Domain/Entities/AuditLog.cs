using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("audit_logs", Schema = "audit")]
public class AuditLog
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("table_name")]
    public string? TableName { get; set; }

    [Column("record_id")]
    public Guid RecordId { get; set; }

    [Column("action")]
    public string? Action { get; set; } // INSERT / UPDATE / DELETE

    [Column("old_data", TypeName = "jsonb")]
    public string? OldData { get; set; }

    [Column("new_data", TypeName = "jsonb")]
    public string? NewData { get; set; }

    [Column("performed_by")]
    public string? PerformedBy { get; set; }

    [Column("performed_on")]
    public DateTime PerformedOn { get; set; }

    [Column("ip_address")]
    public string? IpAddress { get; set; }
}