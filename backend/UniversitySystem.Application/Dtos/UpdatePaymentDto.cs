public class UpdatePaymentDto
{
    public string ReceiptNumber { get; set; } = string.Empty;

    public string? OrderId { get; set; }
    public string? TransactionId { get; set; }

    public decimal PaidAmount { get; set; }
    public string Status { get; set; } = "SUCCESS";

    public DateTime PaymentDate { get; set; }
}