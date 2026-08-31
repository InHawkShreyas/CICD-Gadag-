public interface IExamApplicationRepository
{
    Task<ExamApplication> CreateAsync(
        ExamApplication entity);

    Task<ExamApplication?> GetByIdAsync(
        Guid id);

    Task<List<ExamApplication>> GetAllAsync();

    Task UpdateAsync(
        ExamApplication entity);

    Task<ExamApplication?> GetLastApplicationAsync();
}