public interface ICourseService
{
    Task<Course> CreateAsync(CreateCourseDto dto);
    Task<List<Course>> GetAllAsync();
    Task<List<Course>> GetByDegreeIdAsync(Guid degreeId);
    Task<Course?> GetByIdAsync(Guid id);
    Task<bool> UpdateAsync(UpdateCourseDto dto);
    Task<bool> DeleteAsync(Guid id);
}