public interface IExamApplicationService
{
    Task<Guid> CreateAsync(
        CreateExamApplicationDto dto);

    Task<List<ExamApplication>> GetAllAsync();

    Task<ExamApplication?> GetByIdAsync(
        Guid id);

    Task<List<ExamApplicationDetailDto>> GetDetailsByApplicationIdAsync(Guid applicationId);

    Task AcademicApproveAsync(Guid applicationId, AcademicApproveDto dto);

    Task FinalApproveAsync(Guid applicationId, FinalApproveDto dto);


        Task<List<ExamApplication>> GetApprovedAsync(
        Guid  academicYearId,
        Guid  semId,
        Guid? degreeId  = null,
        Guid? courseId  = null);
}