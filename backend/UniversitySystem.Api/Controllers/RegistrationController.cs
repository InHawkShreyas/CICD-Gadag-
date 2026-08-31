using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

[ApiController]
[Route("api/registration")]
public class RegistrationController : ControllerBase
{
    private readonly IRegistrationService _service;

    public RegistrationController(IRegistrationService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> Create(RegistrationRequestDto request)
    {
        var result = await _service.CreateAsync(request);
        return Ok(result);
    }

    [HttpGet("{username}")]
    public async Task<IActionResult> GetByUsername(string username)
    {
        var result = await _service.GetByUsernameAsync(username);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    // ✅ GET ALL
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(result);
    }

    // ✅ SOFT DELETE
    [HttpDelete("{username}")]
    public async Task<IActionResult> Delete(string username)
    {
        await _service.SoftDeleteAsync(username);
        return Ok("Deleted successfully");
    }

    // ✅ UPDATE EXAM REGISTRATION FLAG
    [HttpPatch("{username}/exam-registration")]
    public async Task<IActionResult> UpdateExamRegistration(
        string username,
        [FromBody] UpdateExamRegistrationDto dto)
    {
        await _service.UpdateExamRegistrationAsync(username, dto.ExamRegistration);
        return Ok(new { message = "Exam registration updated successfully" });
    }

    [HttpGet("check-identity/{documentType}/{value}")]
    [EnableRateLimiting("identity-check")]
    public async Task<IActionResult> CheckIdentityExists(string documentType, string value)
    {
        if (documentType is not ("aadhar" or "passport"))
            return BadRequest(new { message = "documentType must be 'aadhar' or 'passport'" });

        var result = await _service.CheckIdentityStatusAsync(documentType, value);
        return Ok(result);
    }

    [HttpPatch("{existingUsername}/resume")]
    public async Task<IActionResult> ResumeIncomplete(string existingUsername, [FromBody] RegistrationRequestDto request)
    {
        var result = await _service.ResumeIncompleteAsync(existingUsername, request);
        return Ok(result);
    }
}