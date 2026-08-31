public interface ISubjectRepository
{
    Task<Subject> CreateAsync(Subject entity);

    Task<List<Subject>> GetAllAsync();

    Task<Subject?> GetByIdAsync(Guid id);

    Task UpdateAsync(Subject entity);

    Task<Subject?> GetByCodeAsync(string code);

    Task DeleteAsync(Guid id);
}