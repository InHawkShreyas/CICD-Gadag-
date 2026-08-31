using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("lookup")]
public class Lookup : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("code")]
    public string? Code { get; set; }

    [Column("name")]
    public string? Name { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("type")]
    public string? Type { get; set; }

    [Column("type2")]
    public string? Type2 { get; set; }

    [Column("extra_int1")]
    public int? ExtraInt1 { get; set; }

    [Column("extra_int2")]
    public int? ExtraInt2 { get; set; }

    [Column("start_date")]
    public DateOnly? StartDate { get; set; }

    [Column("end_date")]
    public DateOnly? EndDate { get; set; }

    [Column("extra_description")]
    public string? ExtraDescription { get; set; }

    [Column("debug_no")]
    public int DebugNo { get; set; }


}