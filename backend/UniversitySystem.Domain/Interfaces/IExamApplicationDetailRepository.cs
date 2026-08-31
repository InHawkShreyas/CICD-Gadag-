public interface IExamApplicationDetailRepository
{
    Task CreateRangeAsync(
        List<ExamApplicationDetail> entities);

    Task<List<ExamApplicationDetail>>
        GetByApplicationIdAsync(
            Guid applicationId);

    Task UpdateAsync(ExamApplicationDetail entity);
}