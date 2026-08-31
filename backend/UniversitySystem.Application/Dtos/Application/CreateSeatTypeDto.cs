public class CreateSeatTypeDto
{
    public Guid ApplicationId { get; set; }
    public string? ApplicationNo { get; set; }

    public Guid SeatTypeId { get; set; }   // 🔥 from frontend (lookup)
    public string SeatTypeName { get; set; } = string.Empty;
}