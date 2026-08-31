public interface IAcademicDateRepository
{
    Task<AcademicDate> CreateAsync(AcademicDate entity);
    Task<List<AcademicDate>> GetAllAsync();
    Task<AcademicDate?> GetByIdAsync(Guid id);
    Task UpdateAsync(AcademicDate entity);
}