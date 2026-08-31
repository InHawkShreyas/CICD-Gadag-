public class EasebuzzInitRequest
{
    public string ReceiptNo { get; set; }        // Application No / Receipt
    public string ApplicationId { get; set; }    // AppNo
    public string Name { get; set; }
    public string Email { get; set; }
    public string Phone { get; set; }
    public decimal CollegePayable { get; set; }  // Application fee
    public decimal ServiceCharge { get; set; }   // Platform charge
    public string FeeType { get; set; }          // 🔥 NEW (e.g. "MGRDPU")
}