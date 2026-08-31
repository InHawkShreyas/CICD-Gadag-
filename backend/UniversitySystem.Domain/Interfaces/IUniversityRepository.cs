public interface IUniversityRepository
{
    Task<University> CreateAsync(University entity);
    Task<List<University>> GetAllAsync();
    Task<University?> GetByIdAsync(Guid id);
    Task UpdateAsync(University entity);
}