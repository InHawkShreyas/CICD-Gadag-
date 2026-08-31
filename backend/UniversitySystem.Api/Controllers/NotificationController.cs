using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _service;

    public NotificationController(INotificationService service)
    {
        _service = service;
    }

    // ✅ CREATE (FORM-DATA)
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromForm] string title,
        [FromForm] string? description,
        [FromForm] DateTime? date,
        [FromForm] IFormFile? file)
    {
        var notification = new Notification
        {
            Title = title,
            Description = description,
            Date = date ?? DateTime.UtcNow
        };

        await _service.CreateAsync(notification, file);

        return Ok(new { success = true });
    }

    // ✅ UPDATE (FORM-DATA)
    [HttpPut]
    public async Task<IActionResult> Update(
        [FromForm] Guid id,
        [FromForm] string title,
        [FromForm] string? description,
        [FromForm] DateTime? date,
        [FromForm] IFormFile? file)
    {
        var notification = new Notification
        {
            Id = id,
            Title = title,
            Description = description,
            Date = date ?? DateTime.UtcNow
        };

        await _service.UpdateAsync(notification, file);

        return Ok(new { success = true });
    }

    // ✅ GET ALL
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var data = await _service.GetAllAsync();
        return Ok(data);
    }

    // ✅ GET BY ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var data = await _service.GetByIdAsync(id);

        if (data == null)
            return NotFound();

        return Ok(data);
    }

    // ✅ DOWNLOAD FILE 🔥
    [HttpGet("{id}/file")]
        public async Task<IActionResult> GetFile(Guid id)
        {
            var result = await _service.GetFileAsync(id);

            if (result == null)
                return NotFound();

            return File(result.Value.fileBytes, result.Value.contentType, result.Value.fileName);
        }

    // ✅ SOFT DELETE
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok(new { success = true });
    }
}