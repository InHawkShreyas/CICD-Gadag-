using Microsoft.AspNetCore.Http;

public interface INotificationService
{
    Task CreateAsync(Notification notification, IFormFile? file);

    Task UpdateAsync(Notification notification, IFormFile? file);

    Task<List<Notification>> GetAllAsync();

    Task<Notification?> GetByIdAsync(Guid id);

    Task DeleteAsync(Guid id);

    // 🔥 file download
    Task<(byte[] fileBytes, string contentType, string fileName)?> GetFileAsync(Guid id);
}