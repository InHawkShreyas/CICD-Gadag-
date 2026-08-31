using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

[Table("education_details", Schema = "admission")]
public class EducationDetail : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("application_id")]
    public Guid ApplicationId { get; set; }

    [MaxLength(50)]
    [Column("app_no")]
    public string? AppNo { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("exam_name")]
    public string ExamName { get; set; } = null!;

    [Column("max_marks")]
    public decimal? MaxMarks { get; set; }

    [Column("obtained_marks")]
    public decimal? ObtainedMarks { get; set; }

    [MaxLength(50)]
    [Column("registration_number")]
    public string? RegistrationNumber { get; set; }

    [Column("percentage")]
    public decimal? Percentage { get; set; }

    [Column("cgpa")]
    public decimal? CGPA { get; set; }

    [Column("year")]
    public int? year { get; set; }

    // 🔗 FK Navigation
    [JsonIgnore]
    [ForeignKey("ApplicationId")]
    public Applications? Application { get; set; }
}