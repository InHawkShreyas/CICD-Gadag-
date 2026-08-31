using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Authorize] // 🔐 PROTECT ALL APIs
public class AdmissionFeeStructureController : ControllerBase
{
    private readonly IAdmissionFeeStructureService _service;

    public AdmissionFeeStructureController(IAdmissionFeeStructureService service)
    {
        _service = service;
    }

    // ✅ CREATE (MASTER + DETAILS)
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AdmissionFeeStructure model)
    {
        if (model == null)
            return BadRequest("Invalid data");

        var result = await _service.CreateAsync(model);
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

    // ✅ UPDATE (MASTER + DETAILS)
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] AdmissionFeeStructure model)
    {
        if (model == null || model.Id == Guid.Empty)
            return BadRequest("Invalid data");

        try
        {
            var success = await _service.UpdateAsync(model);

            if (!success)
                return NotFound();

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message, detail = ex.InnerException?.Message });
        }
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
    [HttpGet("by-filters")]
    public async Task<IActionResult> GetByFilters(
        [FromQuery] Guid degreeId,
        [FromQuery] Guid courseId,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] Guid? academicYearId = null)
    {
        var result = await _service.GetByFiltersAsync(degreeId, courseId, categoryId, academicYearId);

        if (result == null)
            return NotFound(new { message = "Fee structure not found" });

        return Ok(result);
    }
}