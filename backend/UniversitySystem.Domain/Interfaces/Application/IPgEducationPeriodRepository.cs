using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Domain.Entities;

namespace UniversitySystem.Domain.Interfaces.Application
{
    public interface IPgEducationPeriodRepository
    {
        Task<IReadOnlyList<PgEducationPeriod>> GetByDetailIdAsync(Guid pgEducationDetailId);
        Task AddRangeAsync(IEnumerable<PgEducationPeriod> periods);
        void RemoveRange(IEnumerable<PgEducationPeriod> periods);
        Task<int> SaveChangesAsync();
    }
}
