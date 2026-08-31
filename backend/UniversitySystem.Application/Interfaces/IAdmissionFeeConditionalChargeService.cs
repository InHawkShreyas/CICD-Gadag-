using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Application.Dtos;

namespace UniversitySystem.Application.Interfaces
{
    public interface IAdmissionFeeConditionalChargeService
    {
        Task<List<AdmissionFeeConditionalChargeDto>> GetAllAsync();
        Task<AdmissionFeeConditionalChargeDto?> GetByIdAsync(Guid id);
        Task<AdmissionFeeConditionalChargeDto> CreateAsync(AdmissionFeeConditionalChargeCreateUpdateDto dto, string user);
        Task<bool> UpdateAsync(AdmissionFeeConditionalChargeCreateUpdateDto dto, string user);
        Task<bool> DeleteAsync(Guid id);
    }
}
