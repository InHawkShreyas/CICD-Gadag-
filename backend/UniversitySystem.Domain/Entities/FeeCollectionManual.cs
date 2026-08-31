using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniversitySystem.Domain.Entities;

[Table("fee_collection_manual", Schema = "fees")]
public class FeeCollectionManual : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(50)]
    [Column("receipt_no")]
    public string ReceiptNo { get; set; } = null!;

    [Required]
    [MaxLength(200)]
    [Column("fee_name")]
    public string FeeName { get; set; } = null!;

    [Column("fee_amount", TypeName = "numeric(12,2)")]
    public decimal FeeAmount { get; set; }

    [MaxLength(150)]
    [Column("transaction_id")]
    public string? TransactionId { get; set; }

    [MaxLength(150)]
    [Column("order_id")]
    public string? OrderId { get; set; }

    [MaxLength(50)]
    [Column("payment_mode")]
    public string? PaymentMode { get; set; }

    [Column("payment_date")]
    public DateTime? PaymentDate { get; set; }

    [MaxLength(50)]
    [Column("app_no")]
    public string? AppNo { get; set; }

    [Column("app_id")]
    public Guid? AppId { get; set; }

    [Column("degree_id")]
    public Guid? DegreeId { get; set; }

    [Column("course_id")]
    public Guid? CourseId { get; set; }

    // Navigation Property
    public virtual ICollection<FeeCollectionManualDetail> Details { get; set; }
        = new List<FeeCollectionManualDetail>();
}