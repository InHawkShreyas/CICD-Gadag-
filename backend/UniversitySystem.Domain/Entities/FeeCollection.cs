using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("fee_collections", Schema = "fees")]
public class FeeCollection
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("application_id")]
    public Guid ApplicationId { get; set; }

    [Column("application_no")]
    public string? ApplicationNo { get; set; }

    [Column("name")]
    public string? Name { get; set; }

    [Column("fee_type")]
    public string? FeeType { get; set; }

    [Column("amount")]
    public decimal? Amount { get; set; }

    [Column("paid_amount")]
    public decimal? PaidAmount { get; set; }

    [Column("payment_date")]
    public DateTime? PaymentDate { get; set; }

    [Column("status")]
    public string? Status { get; set; }

    [Column("transaction_id")]
    public string? TransactionId { get; set; }

    [Column("order_id")]
    public string? OrderId { get; set; }

    [Column("receipt_number")]
    public string? ReceiptNumber { get; set; }

    [Column("platform_charges")]
    public decimal? PlatformCharges { get; set; }

    [Column("degree_id")]
    public Guid? DegreeId { get; set; }

    [Column("course_id")]
    public Guid? CourseId { get; set; }

    // ✅ NEW FIELDS
    [Column("email")]
    public string? Email { get; set; }

    [Column("mobile")]
    public string? Mobile { get; set; }

    // 🔽 Audit fields
    [Column("insert_by")]
    public string? InsertBy { get; set; }

    [Column("insert_on")]
    public DateTime? InsertOn { get; set; }

    [Column("update_by")]
    public string? UpdateBy { get; set; }

    [Column("update_on")]
    public DateTime? UpdateOn { get; set; }

    [Column("settlement_date")]
    public DateOnly? SettlementDate { get; set; }

    [Column("settlement_id")]
    public string? SettlementId { get; set; }


    [Column("refund_id")]
    public string? RefundId { get; set; }

    [Column("refund_date")]
    public DateTime? RefundDate { get; set; }



}