using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Domain.Entities;

namespace UniversitySystem.Domain.Interfaces
{
    public interface IAdmissionFeeConditionalChargeRepository
    {
        Task<List<AdmissionFeeConditionalCharge>> GetAllAsync();
        Task<AdmissionFeeConditionalCharge?> GetByIdAsync(Guid id);
        Task AddAsync(AdmissionFeeConditionalCharge entity);
        void Update(AdmissionFeeConditionalCharge entity);
        void Delete(AdmissionFeeConditionalCharge entity);
        Task SaveChangesAsync();
    }
}
