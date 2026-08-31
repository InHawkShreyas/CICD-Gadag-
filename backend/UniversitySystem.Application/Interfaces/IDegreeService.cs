public interface IDegreeService
{
    Task<Degree> CreateAsync(CreateDegreeDto dto);
    Task<List<Degree>> GetAllAsync();
    Task<List<Degree>> GetByUniversityIdAsync(Guid universityId);
    Task<Degree?> GetByIdAsync(Guid id);
    Task<bool> UpdateAsync(UpdateDegreeDto dto);
    Task<bool> DeleteAsync(Guid id);
}