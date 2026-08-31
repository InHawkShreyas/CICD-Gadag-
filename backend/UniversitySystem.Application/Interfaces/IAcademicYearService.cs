using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface IAcademicYearService
{
    Task<AcademicYear> CreateAsync(CreateAcademicYearDto dto);

    Task<List<AcademicYear>> GetAllAsync();

    Task<AcademicYear?> GetByIdAsync(Guid id);

    Task<bool> UpdateAsync(UpdateAcademicYearDto dto);

    Task<bool> DeleteAsync(Guid id); // 🔥 soft delete
}