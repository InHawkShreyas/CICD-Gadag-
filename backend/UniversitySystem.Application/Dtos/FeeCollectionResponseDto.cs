using System.ComponentModel.DataAnnotations.Schema;

public class FeeCollectionResponseDto
{
    public Guid Id { get; set; }

    public Guid ApplicationId { get; set; }
    public string? ApplicationNo { get; set; }

    public string? Name { get; set; }
    public string? FeeType { get; set; }

    public string? Email { get; set; }
    public string? Mobile { get; set; }

    public decimal Amount { get; set; }
    public decimal PlatformCharges { get; set; }
    public decimal PaidAmount { get; set; }

    public DateTime? PaymentDate { get; set; }
    public string? Status { get; set; }

    public string? TransactionId { get; set; }
    public string? OrderId { get; set; }

    public string? ReceiptNumber { get; set; }
    public DateOnly? SettlementDate { get; set; }    
    public string? SettlementId { get; set; }
    public string? RefundId { get; set; }
    public DateTime? RefundDate { get; set; }
    public Guid? DegreeId { get; set; }
    public Guid? CourseId { get; set; }
}

public class PagedFeeCollectionResult
{
    public List<FeeCollectionResponseDto> Items { get; set; } = new();
    public int TotalGroups { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public FeeTotalsDto Totals { get; set; } = new();
}

public class FeeTotalsDto
{
    public decimal Total { get; set; }
    public decimal ApplicationFees { get; set; }
    public decimal AdmissionFees { get; set; }
}