using Microsoft.AspNetCore.Mvc;
using UniversitySystem.Application.Dtos;
using UniversitySystem.Application.Interfaces;

namespace UniversitySystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdmissionFeeConditionalChargeController : ControllerBase
    {
        private readonly IAdmissionFeeConditionalChargeService _service;
        public AdmissionFeeConditionalChargeController(IAdmissionFeeConditionalChargeService service) => _service = service;

        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await _service.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create(AdmissionFeeConditionalChargeCreateUpdateDto dto)
        {
            var user = User?.Identity?.Name ?? "system";
            var result = await _service.CreateAsync(dto, user);
            return Ok(result);
        }

        [HttpPut]
        public async Task<IActionResult> Update(AdmissionFeeConditionalChargeCreateUpdateDto dto)
        {
            var user = User?.Identity?.Name ?? "system";
            var success = await _service.UpdateAsync(dto, user);
            return success ? Ok(new { success = true }) : NotFound();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var success = await _service.DeleteAsync(id);
            return success ? Ok(new { success = true }) : NotFound();
        }
    }
}
