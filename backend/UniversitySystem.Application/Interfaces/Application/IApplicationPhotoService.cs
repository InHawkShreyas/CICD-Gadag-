using Microsoft.AspNetCore.Http;

public interface IApplicationPhotoService
{
    Task<ApplicationPhotoResponseDto?> GetByApplicationIdAsync(Guid applicationId);

    Task<ApplicationPhotoResponseDto> UploadAsync(
        Guid applicationId,
        string appNo,
        IFormFile? photo,
        IFormFile? signature,
        IFormFile? parentSignature
    );
}