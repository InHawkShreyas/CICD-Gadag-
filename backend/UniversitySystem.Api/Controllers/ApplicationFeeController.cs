using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniversitySystem.Application.Dtos;
using UniversitySystem.Application.Interfaces;

namespace UniversitySystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ApplicationFeeController : ControllerBase
    {
        private readonly IApplicationFeeService _service;

        public ApplicationFeeController(IApplicationFeeService service)
        {
            _service = service;
        }

        [HttpPost("upsert")]
        public async Task<IActionResult> Upsert([FromBody] ApplicationFeeUpsertDto dto)
        {
            var result = await _service.UpsertAsync(dto);
            return Ok(result);
        }

        [HttpPost("bulk-upsert")]
        public async Task<IActionResult> BulkUpsert([FromBody] ApplicationFeeBulkUpsertDto dto)
        {
            try
            {
                var results = await _service.BulkUpsertAsync(dto);
                return Ok(results);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null)
                return NotFound(new { message = "Application fee record not found." });
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool? isActive = null)
        {
            var result = await _service.GetAllAsync(isActive);
            return Ok(result);
        }
    }
}