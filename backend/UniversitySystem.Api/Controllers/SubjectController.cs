using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubjectController : ControllerBase
{
    private readonly ISubjectService _service;

    public SubjectController(
        ISubjectService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateSubjectDto dto)
    {
        var result =
            await _service.CreateAsync(dto);

        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result =
            await _service.GetAllAsync();

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(
        Guid id)
    {
        var result =
            await _service.GetByIdAsync(id);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    [HttpPut]
    public async Task<IActionResult> Update(
        [FromBody] UpdateSubjectDto dto)
    {
        await _service.UpdateAsync(dto);

        return Ok(new
        {
            message = "Subject updated successfully"
        });
    }


    [HttpDelete("{id:guid}")]
public async Task<IActionResult> Delete(Guid id)
{
    await _service.DeleteAsync(id);
    return Ok(new { message = "Subject deleted successfully" });
}
}