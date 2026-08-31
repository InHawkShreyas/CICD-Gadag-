public interface IApplicationDocumentRepository
{
    Task CreateAsync(ApplicationDocument entity);
    Task UpdateAsync(ApplicationDocument entity);
    Task<ApplicationDocument?> GetByIdAsync(Guid id);
    Task<List<ApplicationDocument>> GetAllAsync();
     Task<List<ApplicationDocument>> GetByApplicationIdAsync(Guid applicationId);
      Task<Applications?> GetByAppNoAsync(string applicationNo);
      

}