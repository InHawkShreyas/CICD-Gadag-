using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

[Table("application_photo", Schema = "admission")]
public class application_photo : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("application_id")]
    public Guid ApplicationId { get; set; }

    [Column("app_no")]
    public string? AppNo { get; set; }

    [Column("photo_url")]
    public string? PhotoUrl { get; set; }

    [Column("signature_url")]
    public string? SignatureUrl { get; set; }

    [Column("parent_sign_url")]
    public string? ParentSignUrl {get;set;}

    // 🔗 Navigation property (optional but recommended)
    [JsonIgnore]
    [ForeignKey("ApplicationId")]
    public Applications? Application { get; set; }
}