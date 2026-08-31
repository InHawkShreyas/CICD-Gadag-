using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Authorize] // 🔐 secure it
public class AuditLogController : ControllerBase
{
    private readonly IAuditLogService _service;

    public AuditLogController(IAuditLogService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
    int page = 1,
    int pageSize = 100)
    {
        var result = await _service.GetAllAsync(page, pageSize);
        return Ok(result);
    }

    // ✅ GET BY RECORD ID
    [HttpGet("record/{recordId}")]
    public async Task<IActionResult> GetByRecord(Guid recordId)
    {
        var data = await _service.GetByRecordIdAsync(recordId);

        if (data == null || data.Count == 0)
            return NotFound();

        return Ok(data);
    }
}