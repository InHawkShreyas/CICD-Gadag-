using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

[Table("admission_fee_structure_details", Schema = "fees")]
public class AdmissionFeeStructureDetail : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("header_id")]
    public Guid HeaderId { get; set; }

    [ForeignKey("HeaderId")]
    [JsonIgnore] // 🔥 CRITICAL FIX
    public AdmissionFeeStructure? Header { get; set; }

    [Column("particular_name")]
    public string? ParticularName { get; set; }

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("installment_1")]
    public bool Installment1 { get; set; } = false;

    [Column("installment_2")]
    public bool Installment2 { get; set; } = false;

    [Column("installment1_amt")]
    public decimal? Installment1Amount { get; set; } 

    [Column("installment2_amt")]
    public decimal? Installment2Amount { get; set; }

}