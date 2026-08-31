using Microsoft.AspNetCore.Mvc;
using UniversitySystem.Application.Dtos;
using UniversitySystem.Application.Interfaces;

namespace UniversitySystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DocumentCoordinatorController : ControllerBase
    {
        private readonly IDocumentCoordinatorService _service;

        public DocumentCoordinatorController(IDocumentCoordinatorService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] List<CreateDocumentCoordinatorDto> request)
        {
            try
            {
                var result = await _service.CreateAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);

            if (result == null)
                return NotFound("Document coordinator mapping not found.");

            return Ok(result);
        }

        [HttpPut]
        public async Task<IActionResult> Update([FromBody] UpdateDocumentCoordinatorDto request)
        {
            try
            {
                var result = await _service.UpdateAsync(request);

                if (result == null)
                    return NotFound("Document coordinator mapping not found.");

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, [FromQuery] string updatedBy)
        {
            var result = await _service.SoftDeleteAsync(id, updatedBy);

            if (!result)
                return NotFound("Document coordinator mapping not found.");

            return Ok("Document coordinator mapping deleted successfully.");
        }
    }
}
