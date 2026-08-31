using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface IApplicationRepository
{
    Task<Applications> CreateAsync(Applications entity);

    Task<List<Applications>> GetAllAsync();

    Task<Applications?> GetByIdAsync(Guid id);

    Task<Applications?> GetByAppNoAsync(string appNo);

    Task UpdateAsync(Applications entity);
    Task<Applications?> GetByAppNoAndUserAsync(string appNo, string username);
    Task<Applications?> GetLatestByUsernameAsync(string username);
    Task<List<Applications>> GetAllWithDetailsAsync();
    Task<List<Applications>> GetAllForDocumentVerificationAsync();
}