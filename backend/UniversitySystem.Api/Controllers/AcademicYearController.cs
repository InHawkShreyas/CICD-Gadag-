using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class AcademicYearController : ControllerBase
{
    private readonly IAcademicYearService _service;

    public AcademicYearController(IAcademicYearService service)
    {
        _service = service;
    }

    // ✅ CREATE
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAcademicYearDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return Ok(result);
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

    // ✅ UPDATE
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateAcademicYearDto dto)
    {
        var success = await _service.UpdateAsync(dto);

        if (!success)
            return NotFound();

        return Ok(new { success = true });
    }

    // ✅ DELETE (SOFT DELETE)
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _service.DeleteAsync(id);

        if (!success)
            return NotFound();

        return Ok(new { success = true });
    }
}