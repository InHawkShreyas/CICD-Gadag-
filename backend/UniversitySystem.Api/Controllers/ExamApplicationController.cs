using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExamApplicationController : ControllerBase
{
    private readonly IExamApplicationService _service;

    public ExamApplicationController(
        IExamApplicationService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateExamApplicationDto dto)
    {
        var id =
            await _service.CreateAsync(dto);

        return Ok(new
        {
            Id = id,
            Message =
                "Exam application submitted successfully."
        });
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result =
            await _service.GetAllAsync();

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(
        Guid id)
    {
        var result =
            await _service.GetByIdAsync(id);

        if (result == null)
            return NotFound(new
            {
                Message =
                    "Exam application not found."
            });

        return Ok(result);
    }

    [HttpGet("{id:guid}/details")]
    public async Task<IActionResult> GetDetails(
        Guid id)
    {
        var result =
            await _service
                .GetDetailsByApplicationIdAsync(id);

        return Ok(result);
    }

    [HttpPatch("{id:guid}/academic-approve")]
    public async Task<IActionResult>
        AcademicApprove(
            Guid id,
            [FromBody] AcademicApproveDto dto)
    {
        await _service.AcademicApproveAsync(
            id, dto);

        return Ok(new
        {
            Message =
                "Academic approval saved successfully."
        });
    }

    [HttpPatch("{id:guid}/final-approve")]
    public async Task<IActionResult>
        FinalApprove(
            Guid id,
            [FromBody] FinalApproveDto dto)
    {
        await _service.FinalApproveAsync(
            id, dto);

        return Ok(new
        {
            Message =
                "Final approval saved successfully."
        });
    }
}