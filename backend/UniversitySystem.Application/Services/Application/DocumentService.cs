public class ApplicationDocumentService : IApplicationDocumentService
{
    private readonly IApplicationDocumentRepository _repo;
    private readonly ICurrentUserService _currentUser;
    private readonly IFileService _fileService;

    public ApplicationDocumentService(
        IApplicationDocumentRepository repo,
        ICurrentUserService currentUser,
        IFileService fileService)
    {
        _repo = repo;
        _currentUser = currentUser;
        _fileService = fileService;
    }

    // ✅ CREATE
   public async Task CreateAsync(ApplicationDocumentCreateDto dto)
{
    // 🔍 1. Get Application by ApplicationNo
    var application = await _repo.GetByAppNoAsync(dto.ApplicationNo);

    if (application == null)
        throw new Exception($"Application not found for ApplicationNo: {dto.ApplicationNo}");

    // 📦 2. Create entity
    var entity = new ApplicationDocument
    {
        ApplicationId = application.Id,        // ✅ FK stored internally
        ApplicationNo = dto.ApplicationNo,     // ✅ UI reference
        DocumentName = dto.DocumentName,
        InsertBy = _currentUser.Username,
        InsertOn = DateTime.UtcNow,
        Status = true
    };

    // 📁 3. Upload file (if exists)
    if (dto.File != null)
    {
        var safeName = $"{dto.ApplicationNo}_{SanitizeName(dto.DocumentName)}";
        var fileData = await _fileService.UploadAsync(dto.File, "ApplicationDocuments", safeName);

        entity.FileName = fileData.fileName;
        entity.FileUrl = fileData.fileUrl;
    }

    // 💾 4. Save to DB
    await _repo.CreateAsync(entity);
}
    // ✅ UPDATE
    public async Task UpdateAsync(ApplicationDocumentUpdateDto dto)
    {
        var existing = await _repo.GetByIdAsync(dto.Id);
        if (existing == null) return;

        existing.DocumentName = dto.DocumentName;

        if (dto.File != null)
        {
            // delete old file
            if (!string.IsNullOrEmpty(existing.FileUrl))
                _fileService.Delete(existing.FileUrl);

            var safeName = $"{existing.ApplicationNo}_{SanitizeName(dto.DocumentName)}";
            var fileData = await _fileService.UploadAsync(dto.File, "ApplicationDocuments", safeName);

            existing.FileName = fileData.fileName;
            existing.FileUrl = fileData.fileUrl;
        }

        existing.UpdateBy = _currentUser.Username;
        existing.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(existing);
    }

    // ✅ GET ALL
  public async Task<List<ApplicationDocumentResponseDto>> GetAllAsync()
{
    var data = await _repo.GetAllAsync();

    return data
        .Where(x => x.Status == true)   // ✅ IMPORTANT: soft delete filter
        .Select(x => new ApplicationDocumentResponseDto
        {
            Id = x.Id,
            ApplicationId = x.ApplicationId,
            ApplicationNo = x.ApplicationNo,
            DocumentName = x.DocumentName,
            FileName = x.FileName,
            FileUrl = x.FileUrl
        })
        .ToList();
}

    // ✅ GET BY ID
   public async Task<ApplicationDocumentResponseDto?> GetByIdAsync(Guid id)
{
    var x = await _repo.GetByIdAsync(id);

    if (x == null || x.Status == false)   // ✅ IMPORTANT FIX
        return null;

    return new ApplicationDocumentResponseDto
    {
        Id = x.Id,
        ApplicationId = x.ApplicationId,
        ApplicationNo = x.ApplicationNo,
        DocumentName = x.DocumentName,
        FileName = x.FileName,
        FileUrl = x.FileUrl
    };
}

    // ✅ SOFT DELETE
    public async Task DeleteAsync(Guid id)
    {
        var existing = await _repo.GetByIdAsync(id);
        if (existing == null) return;

        existing.Status = false;
        existing.UpdateBy = _currentUser.Username;
        existing.UpdateOn = DateTime.UtcNow;

        await _repo.UpdateAsync(existing);
    }

    // ✅ DOWNLOAD FILE
    public async Task<(byte[] fileBytes, string contentType, string fileName)?> GetFileAsync(Guid id)
    {
        var entity = await _repo.GetByIdAsync(id);

        if (entity == null || string.IsNullOrEmpty(entity.FileUrl))
            return null;

        return await _fileService.GetAsync(entity.FileUrl);
    }


   
   public async Task<List<ApplicationDocumentResponseDto>> GetByApplicationIdAsync(Guid applicationId)
{
    var data = await _repo.GetByApplicationIdAsync(applicationId);

    return data.Select(x => new ApplicationDocumentResponseDto
    {
        Id = x.Id,
        ApplicationId = x.ApplicationId,
        ApplicationNo = x.ApplicationNo,
        DocumentName = x.DocumentName,
        FileName = x.FileName,
        FileUrl = x.FileUrl
    }).ToList();
}

    private static string SanitizeName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "document";
        return System.Text.RegularExpressions.Regex
            .Replace(name.Trim(), @"[^a-zA-Z0-9_\-]", "_");
    }
}