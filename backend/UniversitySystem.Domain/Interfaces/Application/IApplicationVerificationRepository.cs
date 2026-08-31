public interface IApplicationVerificationRepository
{
    Task<ApplicationVerification> CreateAsync(ApplicationVerification entity);

    Task UpdateAsync(ApplicationVerification entity);

    Task<ApplicationVerification?> GetByIdAsync(Guid id);

    Task<List<ApplicationVerification>> GetAllAsync();

    Task<ApplicationVerification?> GetByAppNoAsync(string appNo);
}