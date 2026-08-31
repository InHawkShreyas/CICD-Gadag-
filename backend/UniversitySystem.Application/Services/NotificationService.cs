using Microsoft.AspNetCore.Http;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _repo;
    private readonly ICurrentUserService _currentUser;
    private readonly IFileService _fileService;
    private readonly IAuditLogService _auditLog;

    public NotificationService(
        INotificationRepository repo,
        ICurrentUserService currentUser,
        IFileService fileService,
        IAuditLogService auditLog)
    {
        _repo = repo;
        _currentUser = currentUser;
        _fileService = fileService;
        _auditLog = auditLog;
    }

    // ✅ CREATE
    public async Task CreateAsync(Notification notification, IFormFile? file)
    {
        notification.InsertBy = _currentUser.Username;
        notification.InsertOn = DateTime.UtcNow;
        notification.Status = true;

        if (file != null)
        {
            var fileData = await _fileService.UploadAsync(file, "Notification");
            notification.FileName = fileData.fileName;
            notification.FileUrl = fileData.fileUrl;
        }

        await _repo.CreateAsync(notification);

        // 🔥 AUDIT LOG
        await _auditLog.LogAsync("notifications", notification.Id, "INSERT", null, new
        {
            notification.Title,
            notification.Description,
            notification.Date,
            notification.FileName,
            notification.FileUrl,
            notification.InsertBy
        });
    }

    // ✅ UPDATE
    public async Task UpdateAsync(Notification notification, IFormFile? file)
    {
        var existing = await _repo.GetByIdAsync(notification.Id);
        if (existing == null) return;

        // 🔥 OLD VALUES
        var old = new
        {
            existing.Title,
            existing.Description,
            existing.Date,
            existing.FileName,
            existing.FileUrl
        };

        existing.Title = notification.Title;
        existing.Description = notification.Description;
        existing.Date = notification.Date;

        // 🔥 FILE REPLACE
        if (file != null)
        {
            _fileService.Delete(existing.FileUrl);

            var fileData = await _fileService.UploadAsync(file, "Notification");

            existing.FileName = fileData.fileName;
            existing.FileUrl = fileData.fileUrl;
        }

        existing.UpdateBy = _currentUser.Username;
        existing.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(existing);

        // 🔥 AUDIT LOG
        await _auditLog.LogAsync("notifications", existing.Id, "UPDATE", old, new
        {
            existing.Title,
            existing.Description,
            existing.Date,
            existing.FileName,
            existing.FileUrl,
            existing.UpdateBy
        });
    }

    // ✅ GET ALL
    public async Task<List<Notification>> GetAllAsync()
    {
        return await _repo.GetAllAsync();
    }

    // ✅ GET BY ID
    public async Task<Notification?> GetByIdAsync(Guid id)
    {
        return await _repo.GetByIdAsync(id);
    }

    // ✅ SOFT DELETE
    public async Task DeleteAsync(Guid id)
    {
        var existing = await _repo.GetByIdAsync(id);
        if (existing == null) return;

        var old = new
        {
            existing.Title,
            existing.Status
        };

        existing.Status = false;
        existing.UpdateBy = _currentUser.Username;
        existing.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(existing);

        // 🔥 AUDIT LOG
        await _auditLog.LogAsync("notifications", existing.Id, "DELETE", old, null);
    }

    // ✅ DOWNLOAD FILE
    public async Task<(byte[] fileBytes, string contentType, string fileName)?> GetFileAsync(Guid id)
    {
        var entity = await _repo.GetByIdAsync(id);

        if (entity == null || string.IsNullOrEmpty(entity.FileUrl))
            return null;

        return await _fileService.GetAsync(entity.FileUrl);
    }
}