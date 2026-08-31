public interface IStudentRepository
{
    Task<Student> CreateAsync(Student entity);
    Task<List<Student>> CreateBulkAsync(List<Student> entities);
    Task<List<Student>> GetAllAsync();
    Task<Student?> GetByIdAsync(Guid id);
    Task<Student?> GetByRegistrationNumberAsync(string registrationNumber);
    Task<bool> UpdateAsync(Student entity);
    Task<bool> DeleteAsync(Guid id);
}