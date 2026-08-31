using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ApplicationController : ControllerBase
{
    private readonly IApplicationService _service;

    public ApplicationController(IApplicationService service)
    {
        _service = service;
    }

    // ✅ CREATE
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateApplicationFullDto dto)
    {
        try
        {
            var result = await _service.CreateAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
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
            return NotFound(new { message = "Application not found" });

        return Ok(data);
    }

    // ✅ UPDATE
    [HttpPut("{appNo}")]
public async Task<IActionResult> Update(string appNo, [FromBody] CreateApplicationFullDto dto)
{
    try
    {
        var success = await _service.UpdateAsync(appNo, dto);

        if (!success)
            return NotFound(new { message = "Application not found" });

        return Ok(new { message = "Updated successfully" });
    }
    catch (UnauthorizedAccessException ex)
    {
        return Unauthorized(new { message = ex.Message });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new
        {
            message = "Something went wrong",
            error = ex.Message
        });
    }
}

    // ✅ DELETE (SOFT)
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _service.DeleteAsync(id);

        if (!success)
            return NotFound(new { message = "Application not found" });

        return Ok(new { message = "Deleted successfully" });
    }
}