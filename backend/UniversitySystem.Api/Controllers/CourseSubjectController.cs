using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CourseSubjectController
    : ControllerBase
{
    private readonly ICourseSubjectService _service;

    public CourseSubjectController(
        ICourseSubjectService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult>
        Create(
            [FromBody]
            CreateCourseSubjectDto dto)
    {
        var result =
            await _service.CreateAsync(dto);

        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult>
        GetAll()
    {
        var result =
            await _service.GetAllAsync();

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult>
        GetById(Guid id)
    {
        var result =
            await _service.GetByIdAsync(id);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    [HttpPut]
    public async Task<IActionResult>
        Update(
            [FromBody]
            UpdateCourseSubjectDto dto)
    {
        await _service.UpdateAsync(dto);

        return Ok(new
        {
            message =
                "Course Subject updated successfully"
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult>
        Delete(Guid id)
    {
        await _service.DeleteAsync(id);

        return Ok(new
        {
            message =
                "Course Subject deleted successfully"
        });
    }
}