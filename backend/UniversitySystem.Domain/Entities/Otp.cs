using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("otp_logs", Schema = "auth")]
public class OtpLog
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("username")]
    public string Username { get; set; }

    [Column("mobile")]
    public string? Mobile { get; set; }

    [Column("otp")]
    public string Otp { get; set; }

    [Column("is_used")]
    public bool IsUsed { get; set; }

    [Column("expiry_time")]
    public DateTime ExpiryTime { get; set; }

    [Column("insert_on")]
    public DateTime InsertOn { get; set; } = DateTime.UtcNow;

    [Column("status")]
    public bool Status { get; set; } = true;
}