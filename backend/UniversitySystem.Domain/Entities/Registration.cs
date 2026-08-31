using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("registration", Schema = "auth")]
public class Registration : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    [Column("username")]
    public string Username { get; set; }

    [MaxLength(150)]
    [Column("name")]
    public string? Name { get; set; }

    // ⚠️ FIX TYPE based on your DB (you showed int4 earlier)
    [Column("nationality_id")]
    public Guid? NationalityId { get; set; }

    [MaxLength(15)]
    [Column("mobile")]
    public string? Mobile { get; set; }

    [MaxLength(150)]
    [Column("email")]
    public string? Email { get; set; }

    [MaxLength(20)]
    [Column("aadhar_no")]
    public string? AadharNo { get; set; }

    [MaxLength(20)]
    [Column("passport_no")]
    public string? PassportNo { get; set; }

    [Column("dob")]
    public DateTime? Dob { get; set; }

    [Column("usn_no")]
    public string? UsnNo { get; set; }

    [Column("exam_registration")]
    public bool ExamRegistration { get; set; }

    [Column("degree_type_id")]
    public Guid? DegreeTypeId { get; set; }
}