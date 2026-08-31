using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ApplicationCourseDetailController : ControllerBase
{
    private readonly IApplicationCourseDetailService _service;

    public ApplicationCourseDetailController(IApplicationCourseDetailService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateApplicationCourseDetailDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return Ok(result);
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> CreateBulk([FromBody] CreateBulkApplicationCourseDetailDto dto)
    {
        try
        {
            var result = await _service.CreateBulkAsync(dto);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
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

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var data = await _service.GetByIdAsync(id);

        if (data == null)
            return NotFound();

        return Ok(data);
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateApplicationCourseDetailDto dto)
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

    [HttpPatch("{applicationId}/accept/{courseDetailId}")]
    public async Task<IActionResult> AcceptPreference(Guid applicationId, Guid courseDetailId)
    {
        var success = await _service.AcceptPreferenceAsync(applicationId, courseDetailId);
        if (!success)
            return NotFound();
        return Ok(new { message = "Preference accepted successfully" });
    }
}