public class CreateFeeCollectionDto
{
    public Guid ApplicationId { get; set; }
    public string ApplicationNo { get; set; }
    public string Name { get; set; }

    public string? Email { get; set; }
    public string? Mobile { get; set; }

    public decimal Amount { get; set; }
    public decimal PlatformCharges { get; set; }

    public string ReceiptNumber { get; set; }

    // ✅ REQUIRED
    public string FeeType { get; set; }
    public Guid? DegreeId { get; set; }
    public Guid? CourseId { get; set; }
}