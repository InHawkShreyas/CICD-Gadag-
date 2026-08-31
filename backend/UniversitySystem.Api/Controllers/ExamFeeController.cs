using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniversitySystem.Application.Dtos;
using UniversitySystem.Application.Interfaces;

namespace UniversitySystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExamFeeController : ControllerBase
    {
        private readonly IExamFeeService _service;

        public ExamFeeController(IExamFeeService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<IActionResult> Upsert(ExamFeeUpsertDto dto)
        {
            var result = await _service.UpsertAsync(dto);
            return Ok(result);
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var data = await _service.GetAllAsync();
            return Ok(data);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var data = await _service.GetByIdAsync(id);

            if (data == null)
                return NotFound();

            return Ok(data);
        }
    }
}
