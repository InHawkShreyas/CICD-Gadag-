using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public abstract class AuditBase
{
    [MaxLength(100)]
    [Column("insert_by")]
    public string? InsertBy { get; set; }

    [MaxLength(100)]
    [Column("update_by")]
    public string? UpdateBy { get; set; }

    [Column("insert_on")]
    public DateTime InsertOn { get; set; } = DateTime.UtcNow;

    [Column("update_on")]
    public DateTime? UpdateOn { get; set; }

    [Column("status")]
    public bool Status { get; set; } = true;
}