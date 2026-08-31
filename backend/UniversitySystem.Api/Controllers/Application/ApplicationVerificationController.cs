using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ApplicationVerificationController : ControllerBase
{
    private readonly IApplicationVerificationService _service;

    public ApplicationVerificationController(IApplicationVerificationService service)
    {
        _service = service;
    }

    // CREATE
    [HttpPost]
    public async Task<IActionResult> Create(CreateApplicationVerificationDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return Ok(result);
    }

    // UPDATE
    [HttpPut]
    public async Task<IActionResult> Update(UpdateApplicationVerificationDto dto)
    {
        var success = await _service.UpdateAsync(dto);
        return Ok(new { success });
    }

    // GET ALL
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    // GET BY ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var data = await _service.GetByIdAsync(id);
        return data == null ? NotFound() : Ok(data);
    }

    // GET BY APP NO
    [HttpGet("by-app-no/{appNo}")]
    public async Task<IActionResult> GetByAppNo(string appNo)
    {
        var data = await _service.GetByAppNoAsync(appNo);
        return data == null ? NotFound() : Ok(data);
    }

    // DELETE (SOFT)
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _service.DeleteAsync(id);
        return Ok(new { success });
    }
}