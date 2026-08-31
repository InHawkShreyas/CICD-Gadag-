using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("courses", Schema = "public")]
public class Course : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("degree_id")]
    public Guid DegreeId { get; set; }

    [Required]
    [MaxLength(200)]
    [Column("name")]
    public string Name { get; set; }

    [MaxLength(50)]
    [Column("code")]
    public string? Code { get; set; }

    [Column("total_seats")]
    public int TotalSeats { get; set; }
}