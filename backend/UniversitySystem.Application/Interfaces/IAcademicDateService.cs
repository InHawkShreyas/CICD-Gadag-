public interface IAcademicDateService
{
    Task<AcademicDate> CreateAsync(CreateAcademicDateDto dto);
    Task<List<AcademicDate>> GetAllAsync();
    Task<AcademicDate?> GetByIdAsync(Guid id);
    Task<bool> UpdateAsync(UpdateAcademicDateDto dto);
    Task<bool> DeleteAsync(Guid id);
}