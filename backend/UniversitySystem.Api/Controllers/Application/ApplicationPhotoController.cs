using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ApplicationPhotoController : ControllerBase
{
    private readonly IApplicationPhotoService _service;
    private readonly IFileService _fileService;

    public ApplicationPhotoController(
        IApplicationPhotoService service,
        IFileService fileService)
    {
        _service = service;
        _fileService = fileService;
    }

    // ✅ UPLOAD
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(
        [FromForm] Guid applicationId,
        [FromForm] string appNo,
        IFormFile? photo,
        IFormFile? signature,
        IFormFile? parentSignature
    )
    {
        try
        {
            var result = await _service.UploadAsync(
                applicationId,
                appNo,
                photo,
                signature,
                parentSignature
            );

            return Ok(result); // 🔥 return DTO directly (cleaner)
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ✅ GET (FIXED)
    [HttpGet("{applicationId}")]
    public async Task<IActionResult> GetByApplicationId(Guid applicationId)
    {
        var data = await _service.GetByApplicationIdAsync(applicationId);

        if (data == null)
            return NotFound(new { message = "Photo record not found" });

        return Ok(data); // 🔥 includes parentSignUrl now
    }

    // ✅ PHOTO
    [HttpGet("{applicationId}/photo")]
    public async Task<IActionResult> GetPhoto(Guid applicationId)
    {
        var data = await _service.GetByApplicationIdAsync(applicationId);
        if (data == null) return NotFound(new { message = "Photo record not found" });

        if (string.IsNullOrEmpty(data.PhotoUrl))
            return NotFound(new { message = "Photo not uploaded" });

        var file = await _fileService.GetAsync(data.PhotoUrl);
        if (file == null) return NotFound(new { message = "Photo file not found" });

        return File(file.Value.fileBytes, file.Value.contentType, file.Value.fileName);
    }

    // ✅ SIGNATURE
    [HttpGet("{applicationId}/signature")]
    public async Task<IActionResult> GetSignature(Guid applicationId)
    {
        var data = await _service.GetByApplicationIdAsync(applicationId);
        if (data == null) return NotFound(new { message = "Photo record not found" });

        if (string.IsNullOrEmpty(data.SignatureUrl))
            return NotFound(new { message = "Signature not uploaded" });

        var file = await _fileService.GetAsync(data.SignatureUrl);
        if (file == null) return NotFound(new { message = "Signature file not found" });

        return File(file.Value.fileBytes, file.Value.contentType, file.Value.fileName);
    }

    // 🔥 NEW — PARENT SIGNATURE ENDPOINT
    [HttpGet("{applicationId}/parent-signature")]
    public async Task<IActionResult> GetParentSignature(Guid applicationId)
    {
        var data = await _service.GetByApplicationIdAsync(applicationId);
        if (data == null) return NotFound(new { message = "Photo record not found" });

        if (string.IsNullOrEmpty(data.ParentSignUrl))
            return NotFound(new { message = "Parent signature not uploaded" });

        var file = await _fileService.GetAsync(data.ParentSignUrl);
        if (file == null) return NotFound(new { message = "Parent signature file not found" });

        return File(file.Value.fileBytes, file.Value.contentType, file.Value.fileName);
    }
}