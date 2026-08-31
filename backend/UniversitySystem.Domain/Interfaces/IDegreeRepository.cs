public interface IDegreeRepository
{
    Task<Degree> CreateAsync(Degree entity);
    Task<List<Degree>> GetAllAsync();
    Task<List<Degree>> GetByUniversityIdAsync(Guid universityId);
    Task<Degree?> GetByIdAsync(Guid id);
    Task UpdateAsync(Degree entity);
}