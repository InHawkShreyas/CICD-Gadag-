using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("notifications" , Schema = "public")] // change schema if needed
public class Notification : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(200)]
    [Column("title")]
    public string Title { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [MaxLength(255)]
    [Column("file_name")]
    public string? FileName { get; set; }

    [Column("file_url")]
    public string? FileUrl { get; set; }

    [Column("date")]
    public DateTime Date { get; set; }

}
