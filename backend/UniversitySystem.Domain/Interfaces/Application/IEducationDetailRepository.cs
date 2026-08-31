using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface IEducationDetailRepository
{
    Task<EducationDetail> CreateAsync(EducationDetail entity);

    Task<List<EducationDetail>> GetAllAsync();

    Task<List<EducationDetail>> GetByApplicationIdAsync(Guid applicationId);

    Task<EducationDetail?> GetByIdAsync(Guid id);

    Task UpdateAsync(EducationDetail entity);
}