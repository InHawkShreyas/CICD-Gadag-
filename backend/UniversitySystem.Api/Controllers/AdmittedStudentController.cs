using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Authorize] // 🔐 important
public class AdmittedStudentController : ControllerBase
{
    private readonly IAdmittedStudentService _service;

    public AdmittedStudentController(IAdmittedStudentService service)
    {
        _service = service;
    }

    // ✅ CREATE (ADMIT STUDENT)
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAdmittedStudentDto dto)
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

    // ✅ GET BY APPLICATION ID
    [HttpGet("application/{applicationId}")]
    public async Task<IActionResult> GetByApplication(Guid applicationId)
    {
        var data = await _service.GetByApplicationIdAsync(applicationId);

        if (data == null)
            return NotFound(new { message = "Not admitted yet" });

        return Ok(data);
    }

    // ✅ UPDATE (remarks / admit toggle)
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateAdmittedStudentDto dto)
    {
        var ok = await _service.UpdateAsync(dto);

        if (!ok)
            return NotFound(new { message = "Record not found" });

        return Ok(new { success = true });
    }
}