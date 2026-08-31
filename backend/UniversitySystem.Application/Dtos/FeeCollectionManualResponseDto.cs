namespace UniversitySystem.Application.DTOs.FeeCollectionManualDtos;

public class FeeCollectionManualResponseDto
{
    public Guid Id { get; set; }

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

public class PagedFeeCollectionManualResult
{
    public List<FeeCollectionManualResponseDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}