using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("degrees", Schema = "public")]
public class Degree : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("university_id")]
    public Guid UniversityId { get; set; }

    [Required]
    [MaxLength(200)]
    [Column("degree_name")]
    public string DegreeName { get; set; }

    [Column("duration")]
    public string? Duration { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("degree_type_id")]
    public Guid? DegreeTypeId { get; set; }
}