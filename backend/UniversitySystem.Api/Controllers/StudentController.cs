using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class StudentController : ControllerBase
{
    private readonly IStudentService _service;

    public StudentController(IStudentService service)
    {
        _service = service;
    }

    // =============================
    // ✅ UPLOAD EXCEL
    // =============================
    [HttpPost("upload")]
    public async Task<IActionResult> Upload([FromForm] StudentUploadDto dto)
    {
        try
        {
            if (dto.File == null || dto.File.Length == 0)
                return BadRequest(new { message = "File is required" });

            if (dto.DegreeId == Guid.Empty ||
                dto.CourseId == Guid.Empty ||
                dto.AcademicYearId == Guid.Empty)
            {
                return BadRequest(new { message = "Degree, Course, Academic Year required" });
            }

            var result = await _service.UploadAsync(dto);

            return Ok(new
            {
                success = true,
                count = result.Count,
                message = "Students uploaded successfully"
            });
        }
       catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Upload failed",
                error = ex.ToString() // 🔥 FULL ERROR (not just message)
            });
        }
    }

    // =============================
    // ✅ GET ALL
    // =============================
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var data = await _service.GetAllAsync();
        return Ok(data);
    }

    // =============================
    // ✅ GET BY ID
   [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var data = await _service.GetByIdAsync(id);

        if (data == null)
            return NotFound(new { message = "Student not found" });

        return Ok(data);
    }

    // =============================
    // ✅ UPDATE
    // =============================
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] Student entity)
    {
        try
        {
            var result = await _service.UpdateAsync(entity);

            return Ok(new
            {
                success = result,
                message = "Student updated successfully"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Update failed",
                error = ex.Message
            });
        }
    }

    // =============================
    // ✅ DELETE
    // =============================
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _service.DeleteAsync(id);

        if (!result)
            return NotFound(new { message = "Student not found" });

        return Ok(new
        {
            success = true,
            message = "Student deleted successfully"
        });
    }
}