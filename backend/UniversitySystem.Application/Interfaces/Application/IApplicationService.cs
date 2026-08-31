using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface IApplicationService
{
    Task<Applications> CreateAsync(CreateApplicationFullDto dto);

    Task<List<Applications>> GetAllAsync();

    Task<Applications?> GetByIdAsync(Guid id);

   Task<bool> UpdateAsync(string appNo, CreateApplicationFullDto dto);

    Task<bool> DeleteAsync(Guid id);
}