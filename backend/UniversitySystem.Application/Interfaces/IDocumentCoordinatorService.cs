using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Application.Dtos;
using UniversitySystem.Application.Dtos.Application;

namespace UniversitySystem.Application.Interfaces
{
    public interface IDocumentCoordinatorService
    {
        Task<IEnumerable<DocumentCoordinatorDto>> CreateAsync(List<CreateDocumentCoordinatorDto> request);

        Task<DocumentCoordinatorDto?> GetByIdAsync(Guid id);

        Task<IEnumerable<DocumentCoordinatorDto>> GetAllAsync();

        Task<DocumentCoordinatorDto?> UpdateAsync(UpdateDocumentCoordinatorDto request);

        Task<bool> SoftDeleteAsync(Guid id, string updatedBy);
    }
}
