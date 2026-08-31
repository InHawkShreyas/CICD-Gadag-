public class PhonePeCreateRequest
{
    public string ReceiptNumber { get; set; } = "";
    public string ApplicationNo { get; set; } = "";
    public decimal Amount { get; set; }

    // 👇 Applicant Details
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";

    // 👇 Course Details
    public string CourseName { get; set; } = "";
    public string DegreeName { get; set; } = "";

    // 👇 Optional extras
    public string? Category { get; set; }
    public string? Nationality { get; set; }
}