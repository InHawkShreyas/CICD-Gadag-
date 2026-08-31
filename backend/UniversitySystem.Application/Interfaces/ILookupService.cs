using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface ILookupService
{
    Task<List<LookupResponseDto>> GetAllAsync();

  

    Task<LookupResponseDto> CreateAsync(CreateLookupDto dto);

    Task UpdateAsync(Guid id, CreateLookupDto dto);

    Task DeleteAsync(Guid id);

    Task<List<LookupResponseDto>> GetByTypeAndType(string type, string? type2);
}