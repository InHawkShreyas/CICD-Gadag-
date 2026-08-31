using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class SeatTypeController : ControllerBase
{
    private readonly ISeatTypeService _service;

    public SeatTypeController(ISeatTypeService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSeatTypeDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    [HttpGet("application/{applicationId}")]
    public async Task<IActionResult> GetByApplication(Guid applicationId)
    {
        return Ok(await _service.GetByApplicationIdAsync(applicationId));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateSeatTypeDto dto)
    {
        var success = await _service.UpdateAsync(dto);

        if (!success)
            return NotFound();

        return Ok(new { message = "Updated successfully" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _service.DeleteAsync(id);

        if (!success)
            return NotFound();

        return Ok(new { message = "Deleted successfully" });
    }
}