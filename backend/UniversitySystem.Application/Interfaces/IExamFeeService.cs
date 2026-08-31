using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Application.Dtos;

namespace UniversitySystem.Application.Interfaces
{
    public interface IExamFeeService
    {
        Task<object> UpsertAsync(ExamFeeUpsertDto dto);

        Task<List<ExamFeeResponseDto>> GetAllAsync();

        Task<ExamFeeResponseDto?> GetByIdAsync(Guid id);
    }
}
