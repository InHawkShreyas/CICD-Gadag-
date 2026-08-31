using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Domain.Entities;

namespace UniversitySystem.Domain.Interfaces
{
    public interface IDocumentCoordinatorRepository
    {
        Task<IEnumerable<DocumentCoordinatorMapping>> AddAsync(IEnumerable<DocumentCoordinatorMapping> entities);

        Task<DocumentCoordinatorMapping?> GetByIdAsync(Guid id);

        Task<IEnumerable<DocumentCoordinatorMapping>> GetAllAsync();

        Task<DocumentCoordinatorMapping?> UpdateAsync(DocumentCoordinatorMapping entity);

        Task<bool> SoftDeleteAsync(Guid id, string updatedBy);
        Task<bool> ExistsAsync(Guid loginId, Guid? DegreeTypeId, Guid degreeId, Guid courseId, Guid? excludeId = null);
    }
}
