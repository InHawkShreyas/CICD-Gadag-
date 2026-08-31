using UniversitySystem.Application.DTOs.FeeCollectionManualDtos;

public class ApplicationFullResponseDto
{
    public Applications? Application { get; set; }

    public List<EducationDetail> EducationDetails { get; set; } = new();

    public List<ApplicationCourseDetail> CourseDetails { get; set; } = new();

    public List<SeatType> SeatTypes { get; set; } = new();

    // =====================================================
    // NEW
    // =====================================================

    public List<ApplicationDocumentResponseDto>
        Documents { get; set; } = new();

    public List<FeeCollectionResponseDto>
        FeePayments { get; set; } = new();

    public List<FeeCollectionManualResponseDto>
        ManualFeePayments { get; set; } = new();

    public ApplicationVerificationResponseDto?
        Verification { get; set; }
}