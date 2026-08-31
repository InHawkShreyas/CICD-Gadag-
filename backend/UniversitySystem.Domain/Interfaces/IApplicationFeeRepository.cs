using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Domain.Entities;

namespace UniversitySystem.Domain.Interfaces
{
    public interface IApplicationFeeRepository
    {
        Task<ApplicationFee> UpsertAsync(ApplicationFee entity);
        Task<IEnumerable<ApplicationFee>> BulkInsertAsync(IEnumerable<ApplicationFee> entities);
        Task<ApplicationFee?> GetByIdAsync(Guid id);
        Task<IEnumerable<ApplicationFee>> GetAllAsync(bool? isActive = null);
    }
}
