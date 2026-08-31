using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

public class FileService : IFileService
{
    private readonly string _attachmentsRoot;
     private readonly string _contentRootPath; 

    public FileService(IWebHostEnvironment env, IConfiguration config)
    {
          _contentRootPath = env.ContentRootPath;
       
        _attachmentsRoot = config["FileStorage:AttachmentsPath"]
            ?? Path.Combine(env.ContentRootPath, "Attachments");

        Directory.CreateDirectory(_attachmentsRoot);
    }

    // ================= ✅ UPLOAD =================
    public async Task<(string fileName, string fileUrl)> UploadAsync(IFormFile file, string folderName, string? fileName = null)
    {
        var folderPath = Path.Combine(_attachmentsRoot, folderName);
        Directory.CreateDirectory(folderPath);

        var ext = Path.GetExtension(file.FileName);
        fileName = fileName != null
            ? $"{fileName}{ext}"
            : Path.GetFileName(file.FileName);
        var filePath = Path.Combine(folderPath, fileName);

        // 🔒 Prevent overwrite
        int count = 1;
        while (File.Exists(filePath))
        {
            var name = Path.GetFileNameWithoutExtension(fileName);

            fileName = $"{name}({count}){ext}";
            filePath = Path.Combine(folderPath, fileName);
            count++;
        }

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var fileUrl = $"/Attachments/{folderName}/{fileName}";
        return (fileName, fileUrl);
    }

    // ================= ✅ GET =================
    public async Task<(byte[] fileBytes, string contentType, string fileName)?> GetAsync(string? fileUrl)
    {
        if (string.IsNullOrEmpty(fileUrl))
            return null;

        // REMOVE "/Attachments/" prefix
        var relativePath = fileUrl.Replace("/Attachments/", "");

        var fullPath = Path.Combine(
            _attachmentsRoot,
            relativePath.Replace("/", Path.DirectorySeparatorChar.ToString())
        );

        if (!File.Exists(fullPath))
            return null;

        return await ReadFile(fullPath);
    }

    // ================= ✅ DELETE =================
    public void Delete(string? fileUrl)
    {
        if (string.IsNullOrEmpty(fileUrl))
            return;

        var relativePath = fileUrl.TrimStart('/');

        var fullPath = Path.Combine(
            _attachmentsRoot,
            relativePath.Replace("/", Path.DirectorySeparatorChar.ToString())
        );

        if (File.Exists(fullPath))
            File.Delete(fullPath);
    }

    // ================= 🔧 HELPER =================
    private async Task<(byte[] fileBytes, string contentType, string fileName)> ReadFile(string path)
    {
        var bytes = await File.ReadAllBytesAsync(path);

        var ext = Path.GetExtension(path).ToLowerInvariant();
        var contentType = ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };

        return (bytes, contentType, Path.GetFileName(path));
    }

    public async Task<byte[]?> GetLogoBytesAsync()
{
    var logoPath = Path.Combine(_contentRootPath, "Assets", "logo.jpeg");
    if (!File.Exists(logoPath)) return null;
    return await File.ReadAllBytesAsync(logoPath);
}
}