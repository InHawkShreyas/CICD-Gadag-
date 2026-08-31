using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniversitySystem.Domain.Entities;

[Table("fee_collection_manual_details", Schema = "fees")]
public class FeeCollectionManualDetail : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("header_id")]
    public Guid HeaderId { get; set; }

    [Required]
    [MaxLength(200)]
    [Column("particular_name")]
    public string ParticularName { get; set; } = null!;

    [Column("particular_amt", TypeName = "numeric(12,2)")]
    public decimal ParticularAmt { get; set; }

    // Navigation Property
    [ForeignKey(nameof(HeaderId))]
    public virtual FeeCollectionManual? FeeCollectionManual { get; set; }
}