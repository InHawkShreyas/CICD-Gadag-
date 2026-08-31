using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class EducationDetailController : ControllerBase
{
    private readonly IEducationDetailService _service;

    public EducationDetailController(IEducationDetailService service)
    {
        _service = service;
    }

    // ✅ CREATE
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEducationDetailDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return Ok(result);
    }

    // ✅ GET ALL
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    // ✅ GET BY APPLICATION ID
    [HttpGet("application/{applicationId}")]
    public async Task<IActionResult> GetByApplicationId(Guid applicationId)
    {
        return Ok(await _service.GetByApplicationIdAsync(applicationId));
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

    // ✅ UPDATE
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateEducationDetailDto dto)
    {
        var success = await _service.UpdateAsync(dto);

        if (!success)
            return NotFound();

        return Ok(new { message = "Updated successfully" });
    }

    // ✅ DELETE
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _service.DeleteAsync(id);

        if (!success)
            return NotFound();

        return Ok(new { message = "Deleted successfully" });
    }
}