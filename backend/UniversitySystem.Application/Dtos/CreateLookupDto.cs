using System.ComponentModel.DataAnnotations.Schema;

public class CreateLookupDto
{
    public string? Code { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Type { get; set; }
    public string? Type2 { get; set; }
    public int? ExtraInt1 { get; set; }
    public int? ExtraInt2 { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? ExtraDescription { get; set; }
    
}