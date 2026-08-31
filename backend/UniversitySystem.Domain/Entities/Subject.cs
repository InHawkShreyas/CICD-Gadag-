using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("subjects", Schema = "public")]
public class Subject : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("name")]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("code")]
    [MaxLength(100)]
    public string Code { get; set; } = string.Empty;

    [Column("max_marks")]
    public decimal MaxMarks { get; set; }

    [Column("min_marks")]
    public decimal MinMarks { get; set; }
}