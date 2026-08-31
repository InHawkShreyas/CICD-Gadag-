using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Application.Dtos.Application;

namespace UniversitySystem.Application.Interfaces.Application
{
    public interface IPgEducationService
    {
        Task<IReadOnlyList<PgEducationDetailDto>> GetByApplicationIdAsync(Guid applicationId);

        Task<PgEducationDetailDto> SaveTraditionalExamAsync(SaveTraditionalExamRequest request);

        Task<PgEducationDetailDto> SaveDegreeMarksAsync(SaveDegreeMarksRequest request);

        Task DeleteExamAsync(Guid pgEducationDetailId);

        Task DeleteDegreeMarksAsync(Guid applicationId);
        Task<List<PgEducationDetailDto>> GetAllAsync();
    }
}
