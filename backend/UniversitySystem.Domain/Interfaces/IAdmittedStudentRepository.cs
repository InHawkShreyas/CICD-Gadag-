public interface IAdmittedStudentRepository
{
    Task<AdmittedStudent> CreateAsync(AdmittedStudent entity);

    Task<List<AdmittedStudent>> GetAllAsync();

    Task<AdmittedStudent?> GetByIdAsync(Guid id);

    Task<AdmittedStudent?> GetByApplicationIdAsync(Guid applicationId);

    Task UpdateAsync(AdmittedStudent entity);

    Task<bool> ExistsByApplicationIdAsync(Guid applicationId);
}