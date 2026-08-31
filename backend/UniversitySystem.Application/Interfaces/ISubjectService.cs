public interface ISubjectService
{
    Task<SubjectDto> CreateAsync(
        CreateSubjectDto dto);

    Task<List<SubjectDto>> GetAllAsync();

    Task<SubjectDto?> GetByIdAsync(Guid id);

    Task UpdateAsync(
        UpdateSubjectDto dto);

        Task DeleteAsync(Guid id);
}