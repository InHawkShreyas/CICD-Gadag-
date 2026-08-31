using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniversitySystem.Application.DTOs.FeeCollectionManualDtos;

namespace UniversitySystem.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class FeeCollectionManualController : ControllerBase
{
    private readonly IFeeCollectionManualService _service;

    public FeeCollectionManualController(
        IFeeCollectionManualService service
    )
    {
        _service = service;
    }

    // ✅ CREATE
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateFeeCollectionManualDto dto
    )
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

    // ✅ GET PAGED
    [HttpGet("paged")]
    public async Task<IActionResult> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10
    )
    {
        var result = await _service.GetPagedAsync(page, pageSize);

        return Ok(result);
    }

    // ✅ GET BY ID
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);

        if (result == null)
            return NotFound(new
            {
                message = "Fee collection manual not found."
            });

        return Ok(result);
    }

    // ✅ GET BY APPLICATION NUMBER
    [HttpGet("app-no/{appNo}")]
    public async Task<IActionResult> GetByAppNo(string appNo)
    {
        var result = await _service.GetByAppNoAsync(appNo);

        return Ok(result);
    }

    // ✅ UPDATE
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateFeeCollectionManualDto dto
    )
    {
        await _service.UpdateAsync(id, dto);

        return Ok(new
        {
            message = "Fee collection manual updated successfully."
        });
    }
}