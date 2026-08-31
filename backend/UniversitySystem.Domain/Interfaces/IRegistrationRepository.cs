public interface IRegistrationRepository
{
    Task<Registration> CreateAsync(Registration entity);
    Task<Registration?> GetByUsernameAsync(string username);
    Task<List<Registration>> GetAllAsync();
    Task SoftDeleteByUsernameAsync(string username);
    Task UpdateExamRegistrationAsync(string username, bool examRegistration);
    Task<Registration?> GetByAadharAsync(string aadharNo);
    Task<Registration?> GetByPassportAsync(string passportNo);
    Task<List<Registration>> GetAllByAadharAsync(string aadharNo);
    Task<List<Registration>> GetAllByPassportAsync(string passportNo);
    Task UpdateAsync(Registration entity);
}