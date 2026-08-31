public class RefundPaymentDto
{
    public string ReceiptNumber { get; set; } = string.Empty;

    public string RefundId { get; set; } = string.Empty;

    public DateTime RefundDate { get; set; }

    public string Status { get; set; } = "REFUNDED";
}