using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("seat_type", Schema = "admission")]
public class SeatType : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("application_id")]
    public Guid ApplicationId { get; set; }

    [Column("application_no")]
    public string? ApplicationNo { get; set; }

    [Required]
    [Column("seat_type_name")]
    public string SeatTypeName { get; set; } = null!;

    [Column("seat_type_id")]
    public Guid? SeatTypeId { get; set; }
}