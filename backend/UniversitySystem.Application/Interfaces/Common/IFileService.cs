using Microsoft.AspNetCore.Http;

public interface IFileService
{
    Task<(string fileName, string fileUrl)> UploadAsync(IFormFile file, string folderName, string? fileName = null);

    void Delete(string? fileUrl);

    // ✅ FIXED: return full file info
    Task<(byte[] fileBytes, string contentType, string fileName)?> GetAsync(string? fileUrl);

    Task<byte[]?> GetLogoBytesAsync();
}