using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;

[ApiController]
[Authorize]
[Route("api/application-documents")]
public class ApplicationDocumentController : ControllerBase
{
    private readonly IApplicationDocumentService _service;

    public ApplicationDocumentController(IApplicationDocumentService service)
    {
        _service = service;
    }

    // ✅ CREATE
    [HttpPost]
    public async Task<IActionResult> Create([FromForm] ApplicationDocumentCreateDto dto)
    {
        await _service.CreateAsync(dto);
        return Ok("Created successfully");
    }

    // ✅ UPDATE
    [HttpPut]
    public async Task<IActionResult> Update([FromForm] ApplicationDocumentUpdateDto dto)
    {
        await _service.UpdateAsync(dto);
        return Ok("Updated successfully");
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
        return Ok(data);
    }

  [HttpGet("by-app-id/{applicationId}")]
public async Task<IActionResult> GetByAppId(Guid applicationId)
{
    var result = await _service.GetByApplicationIdAsync(applicationId);
    return Ok(result);
}

    // ✅ DELETE
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok("Deleted successfully");
    }

    // ✅ DOWNLOAD FILE
    [HttpGet("download/{id}")]
    public async Task<IActionResult> Download(Guid id)
    {
        var file = await _service.GetFileAsync(id);

        if (file == null)
            return NotFound();

        return File(file.Value.fileBytes, file.Value.contentType, file.Value.fileName);
    }

    
}