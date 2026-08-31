public interface INotificationRepository
{
    Task<Notification> CreateAsync(Notification entity);
    Task<List<Notification>> GetAllAsync();
    Task<Notification?> GetByIdAsync(Guid id);
    Task UpdateAsync(Notification entity);
}