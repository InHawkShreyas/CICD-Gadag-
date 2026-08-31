public interface IAdmittedStudentService
{
    Task<AdmittedStudentResponseDto> CreateAsync(CreateAdmittedStudentDto dto);

    Task<List<AdmittedStudentResponseDto>> GetAllAsync();

    Task<AdmittedStudentResponseDto?> GetByApplicationIdAsync(Guid applicationId);

    Task<bool> UpdateAsync(UpdateAdmittedStudentDto dto);
}