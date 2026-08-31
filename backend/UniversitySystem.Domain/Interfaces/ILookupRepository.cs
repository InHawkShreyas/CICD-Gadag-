using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface ILookupRepository
{
    Task<List<Lookup>> GetAllAsync();

   

    Task<Lookup?> GetByIdAsync(Guid id);

    Task<Lookup> AddAsync(Lookup entity);

    Task UpdateAsync(Lookup entity);

    Task DeleteAsync(Lookup entity);

        Task<List<Lookup>> GetByTypeAndType(string type, string? type2);

            Task<string?> GetNameByIdAsync(Guid id);

}