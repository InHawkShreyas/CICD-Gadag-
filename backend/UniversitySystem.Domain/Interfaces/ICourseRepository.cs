public interface ICourseRepository
{
    Task<Course> CreateAsync(Course entity);
    Task<List<Course>> GetAllAsync();
    Task<List<Course>> GetByDegreeIdAsync(Guid degreeId);
    Task<Course?> GetByIdAsync(Guid id);
    Task UpdateAsync(Course entity);
}