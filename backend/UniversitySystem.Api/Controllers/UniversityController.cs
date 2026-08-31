using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Authorize]
[Route("api/university")]
public class UniversityController : ControllerBase
{
    private readonly IUniversityService _service;

    public UniversityController(IUniversityService service)
    {
        _service = service;
    }

    // ✅ CREATE
    [HttpPost]
    public async Task<IActionResult> Create(CreateUniversityDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return Ok(result);
    }

    // ✅ GET ALL
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(result);
    }

    // ✅ GET BY ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    // ✅ UPDATE
    [HttpPut]
    public async Task<IActionResult> Update(UpdateUniversityDto dto)
    {
        var success = await _service.UpdateAsync(dto);

        if (!success)
            return NotFound();

        return Ok(new { success = true });
    }

    // ✅ SOFT DELETE
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _service.DeleteAsync(id);

        if (!success)
            return NotFound();

        return Ok(new { success = true });
    }
}