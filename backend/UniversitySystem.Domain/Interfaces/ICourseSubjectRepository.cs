public interface ICourseSubjectRepository
{
    Task<CourseSubject> CreateAsync(
        CourseSubject entity);

    Task<List<CourseSubject>> GetAllAsync();

    Task<CourseSubject?> GetByIdAsync(
        Guid id);

    Task UpdateAsync(
        CourseSubject entity);

    Task<CourseSubject?> GetByMappingAsync(
        Guid degreeId,
        Guid courseId,
        Guid semId,
        Guid subjectId);
}