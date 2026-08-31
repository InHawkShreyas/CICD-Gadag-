public interface ICourseSubjectService
{
    Task<CourseSubjectDto> CreateAsync(
        CreateCourseSubjectDto dto);

    Task<List<CourseSubjectDto>> GetAllAsync();

    Task<CourseSubjectDto?> GetByIdAsync(
        Guid id);

    Task UpdateAsync(
        UpdateCourseSubjectDto dto);

    Task DeleteAsync(
        Guid id);
}