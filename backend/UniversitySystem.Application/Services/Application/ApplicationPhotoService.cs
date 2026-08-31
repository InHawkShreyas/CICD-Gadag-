using Microsoft.AspNetCore.Http;

public class ApplicationPhotoService : IApplicationPhotoService
{
    private readonly IApplicationPhotoRepository _repo;
    private readonly IFileService _fileService;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public ApplicationPhotoService(
        IApplicationPhotoRepository repo,
        IFileService fileService,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _repo = repo;
        _fileService = fileService;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    // 🔁 MAPPER
    private ApplicationPhotoResponseDto Map(application_photo x)
    {
        return new ApplicationPhotoResponseDto
        {
            Id = x.Id,
            ApplicationId = x.ApplicationId,
            AppNo = x.AppNo,
            PhotoUrl = x.PhotoUrl,
            SignatureUrl = x.SignatureUrl,
            ParentSignUrl = x.ParentSignUrl
        };
    }

    // ✅ GET
    public async Task<ApplicationPhotoResponseDto?> GetByApplicationIdAsync(Guid applicationId)
    {
        var data = await _repo.GetByApplicationIdAsync(applicationId);
        return data == null ? null : Map(data);
    }

    public async Task<ApplicationPhotoResponseDto> UploadAsync(
        Guid applicationId,
        string appNo,
        IFormFile? photo,
        IFormFile? signature,
        IFormFile? parentSignature
    )
    {
        var before = await _repo.GetByApplicationIdAsync(applicationId);

        string? photoUrl = null;
        string? signUrl = null;
        string? parentSignUrl = null;

        if (photo != null)
        {
            if (before?.PhotoUrl != null) _fileService.Delete(before.PhotoUrl);
            photoUrl = (await _fileService.UploadAsync(photo, "Photo", $"{appNo}_photo")).fileUrl;
        }

        if (signature != null)
        {
            if (before?.SignatureUrl != null) _fileService.Delete(before.SignatureUrl);
            signUrl = (await _fileService.UploadAsync(signature, "Signature", $"{appNo}_signature")).fileUrl;
        }

        if (parentSignature != null)
        {
            if (before?.ParentSignUrl != null) _fileService.Delete(before.ParentSignUrl);
            parentSignUrl = (await _fileService.UploadAsync(parentSignature, "ParentSignature", $"{appNo}_parentsign")).fileUrl;
        }

        var entity = new application_photo
        {
            Id = Guid.NewGuid(),
            ApplicationId = applicationId,
            AppNo = appNo,
            PhotoUrl = photoUrl,
            SignatureUrl = signUrl,
            ParentSignUrl = parentSignUrl,
            InsertBy = _currentUser.Username,
            InsertOn = DateTime.UtcNow,
            Status = true
        };

        var result = await _repo.UpsertAsync(entity);

        await _auditLog.LogAsync(
            "application_photo",
            result.Id,
            before == null ? "INSERT" : "UPDATE",
            before == null ? null : new { before.PhotoUrl, before.SignatureUrl, before.ParentSignUrl },
            new { result.PhotoUrl, result.SignatureUrl, result.ParentSignUrl, result.InsertBy }
        );

        return Map(result);
    }
}