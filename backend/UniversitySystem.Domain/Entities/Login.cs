using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("login", Schema = "auth")]
public class Login : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    [Column("username")]
    public string Username { get; set; }

    [Required]
    [Column("password_hash")]
    public string PasswordHash { get; set; }

    [Column("registration_id")]
    public Guid RegistrationId { get; set; }

    [Column("last_password_change")]
    public DateTime? LastPasswordChange { get; set; }

    [MaxLength(50)]
    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [Column("role_id")]
    public Guid? RoleId { get; set; }

    [ForeignKey(nameof(RegistrationId))]
    public virtual Registration? Registration { get; set; }
}