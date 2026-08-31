public class UpdateApplicationVerificationDto

{

    public Guid Id { get; set; }

    public string? VerificationStatus { get; set; }

    public string? Remark { get; set; }

    public int? Installment { get; set; }

    public bool? FeesEnabled { get; set; }
    public bool? PostPaymentEdit { get; set; }

}