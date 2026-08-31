namespace UniversitySystem.Application.DTOs.FeeCollectionManualDtos;

public class UpdateFeeCollectionManualDto
{
    public string ReceiptNo { get; set; } = null!;

    public string FeeName { get; set; } = null!;

    public decimal FeeAmount { get; set; }

    public string? TransactionId { get; set; }

    public string? OrderId { get; set; }

    public string? PaymentMode { get; set; }

    public DateTime? PaymentDate { get; set; }

    public string? AppNo { get; set; }

    public Guid? AppId { get; set; }
    public Guid? DegreeId { get; set; }
    public Guid? CourseId { get; set; }

    // ✅ ADD THIS
    public List<FeeCollectionManualDetailDto> Details { get; set; }
        = new();
}