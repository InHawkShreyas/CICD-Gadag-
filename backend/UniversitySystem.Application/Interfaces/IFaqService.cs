using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Application.Dtos;

namespace UniversitySystem.Application.Interfaces
{
    public interface IFaqService
    {
        Task<IEnumerable<FaqDto>> GetAllAsync(bool includeInactive);
        Task<FaqDto?> GetByIdAsync(Guid id);
        Task<FaqDto> CreateAsync(CreateFaqDto dto, string performedBy);
        Task<FaqDto?> UpdateAsync(Guid id, UpdateFaqDto dto, string performedBy);
        Task<bool> ToggleActiveAsync(Guid id, string performedBy);
        Task<bool> DeleteAsync(Guid id, string performedBy);
    }
}
