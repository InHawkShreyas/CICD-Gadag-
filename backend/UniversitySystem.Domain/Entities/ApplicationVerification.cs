using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

[Table("application_verification", Schema = "admission")]
public class ApplicationVerification : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("application_id")]
    public Guid ApplicationId { get; set; }

    [Column("app_no")]
    [MaxLength(50)]
    public string? AppNo { get; set; }

    [Column("verification_status")]
    [MaxLength(20)]
    public string? VerificationStatus { get; set; }

    [Column("remark", TypeName = "text")]
    public string? Remark { get; set; }

    [Column("installment")]
    public int? Installment { get; set; }

    [Column("fees_enabled")]
    public bool? FeesEnabled { get; set; }

    [Column("post_payment_edit")]
    public bool? PostPaymentEdit { get; set; }

    // 🔗 Navigation (optional but recommended)
    [JsonIgnore]
    [ForeignKey("ApplicationId")]
    public Applications? Application { get; set; }
}