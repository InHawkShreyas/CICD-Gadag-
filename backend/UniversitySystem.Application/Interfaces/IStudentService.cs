public interface IStudentService
{
    Task<List<Student>> UploadAsync(StudentUploadDto dto);

    Task<List<Student>> GetAllAsync();
    Task<Student?> GetByIdAsync(Guid id);

    Task<bool> UpdateAsync(Student entity);
    Task<bool> DeleteAsync(Guid id);
}