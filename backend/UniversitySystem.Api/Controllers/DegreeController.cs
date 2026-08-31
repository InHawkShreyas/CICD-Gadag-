using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
 [Authorize]
[Route("api/degree")]
public class DegreeController : ControllerBase
{
    private readonly IDegreeService _service;

    public DegreeController(IDegreeService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateDegreeDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    // 🔥 filter by university
    [HttpGet("by-university/{universityId}")]
    public async Task<IActionResult> GetByUniversity(Guid universityId)
    {
        return Ok(await _service.GetByUniversityIdAsync(universityId));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    [HttpPut]
    public async Task<IActionResult> Update(UpdateDegreeDto dto)
    {
        var success = await _service.UpdateAsync(dto);

        if (!success)
            return NotFound();

        return Ok(new { success = true });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _service.DeleteAsync(id);

        if (!success)
            return NotFound();

        return Ok(new { success = true });
    }
}