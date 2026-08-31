using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("applications", Schema = "admission")]
public class Applications : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("app_no")]
    public string AppNo { get; set; }

    [Column("academic_year_id")]
    public Guid? AcademicYearId { get; set; }

    [Required]
    [MaxLength(150)]
    [Column("name")]
    public string Name { get; set; }

    [MaxLength(15)]
    [Column("phone")]
    public string? Phone { get; set; }

    [MaxLength(150)]
    [Column("email")]
    public string? Email { get; set; }

    [Column("dob")]
    public DateOnly? Dob { get; set; }

    [Column("gender_id")]
    public Guid? Gender { get; set; }

    [MaxLength(20)]
    [Column("aadhar_no")]
    public string? AadharNo { get; set; }

    [MaxLength(20)]
    [Column("passport_no")]
    public string? PassportNo { get; set; }

    [MaxLength(30)]
    [Column("visa_no")]
    public string? VisaNo { get; set; }

    [Column("passport_expiry_date")]
    public DateOnly? PassportExpiryDate { get; set; }

    [Column("visa_expiry_date")]
    public DateOnly? VisaExpiryDate { get; set; }

    [MaxLength(150)]
    [Column("father_name")]
    public string? FatherName { get; set; }

    [MaxLength(150)]
    [Column("mother_name")]
    public string? MotherName { get; set; }

    [MaxLength(150)]
    [Column("guardian_name")]
    public string? GuardianName { get; set; }

    [MaxLength(15)]
    [Column("father_no")]
    public string? FatherNo { get; set; }

    [MaxLength(15)]
    [Column("mother_no")]
    public string? MotherNo { get; set; }

    [MaxLength(15)]
    [Column("guardian_no")]
    public string? GuardianNo { get; set; }

    [Column("religion_id")]
    public Guid? Religion { get; set; }

    [Column("category_id")]
    public Guid? CategoryId { get; set; }

    [Column("nationality_id")]
    public Guid? NationalityId { get; set; }

    [MaxLength(50)]
    [Column("caste")]
    public string? Caste { get; set; }

    [MaxLength(50)]
    [Column("rd_number")]
    public string? RdNumber { get; set; }

    [Column("annual_income", TypeName = "numeric(12,2)")]
    public decimal? AnnualIncome { get; set; }

    [MaxLength(150)]
    [Column("place_of_birth")]
    public string? PlaceOfBirth { get; set; }

    [Column("karnataka_yn")]
    public bool? KarnatakaYn { get; set; }

    [Column("permanent_address", TypeName = "text")]
    public string? PermanentAddress { get; set; }

    [Column("communication_address", TypeName = "text")]
    public string? CommunicationAddress { get; set; }

    [Column("status")]
    public bool? Status { get; set; } = true;

    [Column("apaar_id")]
    public string? ApaarId { get; set; }

    [Column("stats_id")]
    public string? StatsId { get; set; }

    [Column("father_occupation")]
    public string? FatherOccupation { get; set; }

    [Column("mother_occupation")]
    public string? MotherOccupation { get; set; }

    [Column("caste_rd_number")]
    public string? CasteRdNumber { get; set; }


    public ICollection<EducationDetail> EducationDetails { get; set; } = new List<EducationDetail>();
    public ICollection<ApplicationCourseDetail> CourseDetails { get; set; } = new List<ApplicationCourseDetail>();
    public ICollection<SeatType> SeatTypes { get; set; } = new List<SeatType>();
    public ICollection<ApplicationDocument> Documents { get; set; } = new List<ApplicationDocument>();
    public ApplicationVerification? Verification { get; set; }
}