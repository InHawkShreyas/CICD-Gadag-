public class UpdateSeatTypeDto
{
    public Guid Id { get; set; }

    public Guid SeatTypeId { get; set; }
    public string SeatTypeName { get; set; } = string.Empty;
}