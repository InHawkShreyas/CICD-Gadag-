using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniversitySystem.Application.Dtos.Application;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ApplicationQueryController : ControllerBase
{
    private readonly IApplicationQueryService _service;
    private readonly ICurrentUserService _currentUser;

    public ApplicationQueryController(
        IApplicationQueryService service,
        ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    // =====================================================
    // ✅ MY APPLICATION
    // =====================================================

    [HttpGet("my")]
    public async Task<IActionResult> GetMy()
    {
        var username = _currentUser.Username;

        if (string.IsNullOrWhiteSpace(username))
            return Unauthorized();

        var data = await _service
            .GetMyApplicationAsync(username);

        if (data == null)
            return NotFound();

        return Ok(data);
    }

    // =====================================================
    // ✅ GET BY APP NO
    // =====================================================

    [HttpGet("full")]
    public async Task<IActionResult> GetByAppNo(
        [FromQuery] string appNo)
    {
        if (string.IsNullOrWhiteSpace(appNo))
        {
            return BadRequest(new
            {
                message = "Application number is required."
            });
        }

        var data = await _service
            .GetByAppNoAsync(appNo);

        if (data == null)
            return NotFound();

        return Ok(data);
    }

    // =====================================================
    // ✅ FILTER
    // =====================================================

    [HttpPost("filter")]
    public async Task<IActionResult> Filter(
        [FromBody] ApplicationFilterDto filter)
    {
        var data = await _service
            .FilterAsync(filter);

        return Ok(data);
    }


    [HttpGet("document-verification")]
    public async Task<ActionResult<List<DocumentVerificationDto>>> GetDocumentVerificationList()
    {
        var result = await _service.GetAllForDocumentVerificationAsync();
        return Ok(result);
    }
}