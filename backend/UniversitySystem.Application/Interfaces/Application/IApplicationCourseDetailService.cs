using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface IApplicationCourseDetailService
{
    Task<ApplicationCourseDetail> CreateAsync(CreateApplicationCourseDetailDto dto);
    Task<List<ApplicationCourseDetail>> CreateBulkAsync(CreateBulkApplicationCourseDetailDto dto);
    Task<List<ApplicationCourseDetail>> GetAllAsync();
    Task<List<ApplicationCourseDetail>> GetByApplicationIdAsync(Guid applicationId);
    Task<ApplicationCourseDetail?> GetByIdAsync(Guid id);
    Task<bool> UpdateAsync(UpdateApplicationCourseDetailDto dto);
    Task<bool> DeleteAsync(Guid id);
    Task<bool> AcceptPreferenceAsync(Guid applicationId, Guid courseDetailId);
}