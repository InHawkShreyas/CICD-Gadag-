public class CreateApplicationFullDto
{
    public Guid? AcademicYearId { get; set; }

    public string AppNo { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateOnly? Dob { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? PlaceOfBirth { get; set; }

    public Guid? Gender { get; set; }
    public Guid? NationalityId { get; set; }
    public bool? KarnatakaYn { get; set; }

    public string? AadharNo { get; set; }
    public string? PassportNo { get; set; }
    public string? VisaNo { get; set; }
    public DateOnly? PassportExpiryDate { get; set; }
    public DateOnly? VisaExpiryDate { get; set; }

    public Guid? Religion { get; set; }
    public Guid? CategoryId { get; set; }
    public string? Caste { get; set; }

    public decimal? AnnualIncome { get; set; }
    public string? RdNumber { get; set; }

    public string? CasteRdNumber { get; set; }

    public string? ApaarId { get; set; }
    public string? StatsId { get; set; }

    public string? FatherName { get; set; }
    public string? FatherNo { get; set; }
    public string? FatherOccupation { get; set; }

    public string? MotherName { get; set; }
    public string? MotherNo { get; set; }
    public string? MotherOccupation { get; set; }

    public string? GuardianName { get; set; }
    public string? GuardianNo { get; set; }
    public string? PermanentAddressLine1 { get; set; }
    public string? PermanentAddressLine2 { get; set; }
    public string? PermanentCity { get; set; }
    public string? PermanentState { get; set; }
    public string? PermanentCountry { get; set; }
    public string? PermanentPostalCode { get; set; }

    public string? PresentAddressLine1 { get; set; }
    public string? PresentAddressLine2 { get; set; }
    public string? PresentCity { get; set; }
    public string? PresentState { get; set; }
    public string? PresentCountry { get; set; }
    public string? PresentPostalCode { get; set; }

    public bool SameAsPermanet { get; set; }
}