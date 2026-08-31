using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Domain.Entities;

namespace UniversitySystem.Domain.Interfaces.Application
{
    public interface IPgEducationDetailRepository
    {
        Task<PgEducationDetail?> GetByIdAsync(Guid id, bool includePeriods = false);
        Task<IReadOnlyList<PgEducationDetail>> GetByApplicationIdAsync(Guid applicationId, bool includePeriods = true);
        Task<PgEducationDetail?> GetDegreeMarksByApplicationIdAsync(Guid applicationId);
        Task AddAsync(PgEducationDetail detail);
        void Update(PgEducationDetail detail);
        void Remove(PgEducationDetail detail);
        Task<int> SaveChangesAsync();
        Task<List<PgEducationDetail>> GetAllAsync();
    }
}
