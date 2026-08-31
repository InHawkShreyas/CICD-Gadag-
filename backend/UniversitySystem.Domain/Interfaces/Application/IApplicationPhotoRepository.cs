public interface IApplicationPhotoRepository
{
    Task<application_photo?> GetByApplicationIdAsync(Guid applicationId);

    Task<application_photo> UpsertAsync(application_photo entity);
}