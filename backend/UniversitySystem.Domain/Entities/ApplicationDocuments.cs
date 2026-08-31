using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("application_documents", Schema = "admission")]
public class ApplicationDocument :AuditBase
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
    [Column("document_name")]
    public string DocumentName { get; set; } = string.Empty;

    [Column("file_name")]
    public string? FileName { get; set; }

    [Column("file_url")]
    public string? FileUrl { get; set; }

}