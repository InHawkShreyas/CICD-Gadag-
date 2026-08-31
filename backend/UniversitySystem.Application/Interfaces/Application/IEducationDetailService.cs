using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface IEducationDetailService
{
    Task<EducationDetail> CreateAsync(CreateEducationDetailDto dto);

    Task<List<EducationDetail>> GetAllAsync();

    Task<List<EducationDetail>> GetByApplicationIdAsync(Guid applicationId);

    Task<EducationDetail?> GetByIdAsync(Guid id);

    Task<bool> UpdateAsync(UpdateEducationDetailDto dto);

    Task<bool> DeleteAsync(Guid id);
}