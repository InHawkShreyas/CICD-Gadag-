using Microsoft.AspNetCore.Http;

public class FileUploadRequest
{
    public IFormFile File { get; set; }
    public string FolderName { get; set; } // 🔥 dynamic (Notification, Profile, etc.)
}