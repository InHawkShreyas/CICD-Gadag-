using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface IApplicationCourseDetailRepository
{
    Task<ApplicationCourseDetail> CreateAsync(ApplicationCourseDetail entity);

    Task<List<ApplicationCourseDetail>> GetAllAsync();

    Task<List<ApplicationCourseDetail>> GetByApplicationIdAsync(Guid applicationId);

    Task<ApplicationCourseDetail?> GetByIdAsync(Guid id);

    Task UpdateAsync(ApplicationCourseDetail entity);
    Task<List<ApplicationCourseDetail>> CreateBulkAsync(IEnumerable<ApplicationCourseDetail> entities);
    Task DeleteAsync(ApplicationCourseDetail entity);
}