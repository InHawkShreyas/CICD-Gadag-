using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Domain.Interfaces
{
    public interface IExamFeeRepository
    {
        Task<ExamFee> CreateAsync(ExamFee entity);

        Task<List<ExamFee>> GetAllAsync();

        Task<ExamFee?> GetByIdAsync(Guid id);

        Task<bool> UpdateAsync(ExamFee entity);
    }
}
