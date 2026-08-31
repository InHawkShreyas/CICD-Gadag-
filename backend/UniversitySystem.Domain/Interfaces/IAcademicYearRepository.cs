using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface IAcademicYearRepository
{
    Task<AcademicYear> CreateAsync(AcademicYear entity);

    Task<List<AcademicYear>> GetAllAsync();

    Task<AcademicYear?> GetByIdAsync(Guid id);

    Task UpdateAsync(AcademicYear entity);
}