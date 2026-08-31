using Microsoft.AspNetCore.Mvc;
using UniversitySystem.Application.Dtos;
using UniversitySystem.Application.Interfaces;

namespace UniversitySystem.Api.Controllers
{
    [ApiController]
    [Route("api/faqs")]
    public class FaqsController : ControllerBase
    {
        private readonly IFaqService _service;

        public FaqsController(IFaqService service) => _service = service;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
        {
            var faqs = await _service.GetAllAsync(includeInactive);
            return Ok(faqs);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var faq = await _service.GetByIdAsync(id);
            return faq is null ? NotFound() : Ok(faq);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateFaqDto dto)
        {
            var performedBy = User.Identity?.Name ?? "Admin";
            var created = await _service.CreateAsync(dto, performedBy);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFaqDto dto)
        {
            var performedBy = User.Identity?.Name ?? "Admin";
            var updated = await _service.UpdateAsync(id, dto, performedBy);
            return updated is null ? NotFound() : Ok(updated);
        }

        [HttpPatch("{id:guid}/toggle-active")]
        public async Task<IActionResult> ToggleActive(Guid id)
        {
            var performedBy = User.Identity?.Name ?? "Admin";
            var success = await _service.ToggleActiveAsync(id, performedBy);
            return success ? NoContent() : NotFound();
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var performedBy = User.Identity?.Name ?? "Admin";
            var success = await _service.DeleteAsync(id, performedBy);
            return success ? NoContent() : NotFound();
        }
    }
}
