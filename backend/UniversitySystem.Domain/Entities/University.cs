using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("universities", Schema = "public")] // 🔥 change schema if needed
public class University : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(200)]
    [Column("name")]
    public string Name { get; set; }

    [Column("address")]
    public string? Address { get; set; }

    [MaxLength(15)]
    [Column("phone_no")]
    public string? PhoneNo { get; set; }

    [MaxLength(150)]
    [Column("email")]
    public string? Email { get; set; }
}