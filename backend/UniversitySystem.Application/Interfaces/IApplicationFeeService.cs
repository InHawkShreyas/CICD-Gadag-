using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Application.Dtos;

namespace UniversitySystem.Application.Interfaces
{
    public interface IApplicationFeeService
    {
        Task<ApplicationFeeResponseDto> UpsertAsync(ApplicationFeeUpsertDto dto);
        Task<IEnumerable<ApplicationFeeResponseDto>> BulkUpsertAsync(ApplicationFeeBulkUpsertDto dto);
        Task<ApplicationFeeResponseDto?> GetByIdAsync(Guid id);
        Task<IEnumerable<ApplicationFeeResponseDto>> GetAllAsync(bool? isActive = null);
    }
}
