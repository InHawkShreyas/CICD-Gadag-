public interface IUniversityService
{
    Task<University> CreateAsync(CreateUniversityDto dto);
    Task<List<University>> GetAllAsync();
    Task<University?> GetByIdAsync(Guid id);
    Task<bool> UpdateAsync(UpdateUniversityDto dto);
    Task<bool> DeleteAsync(Guid id); // soft delete
}