public interface ILoginRepository
{
    Task<Login> CreateAsync(Login entity);
    Task<Login?> GetByUsernameAsync(string username);
    Task UpdateAsync(Login entity);
    Task<bool> UpdateRoleByUsernameAsync(string username, Guid roleId);
    Task<Login?> GetProfileByUsernameAsync(string username);
    Task<bool> ExistsByRegistrationIdAsync(Guid registrationId);
    Task<IEnumerable<Login>> GetByRoleIdAsync(Guid roleId);
}