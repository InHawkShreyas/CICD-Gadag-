using Microsoft.AspNetCore.Mvc;
using UniversitySystem.Application.Dtos.Application;
using UniversitySystem.Application.Interfaces.Application;

namespace UniversitySystem.Api.Controllers.Application
{
    [ApiController]
    [Route("api/pg-education")]
    public class PgEducationController : ControllerBase
    {
        private readonly IPgEducationService _service;

        public PgEducationController(IPgEducationService service)
        {
            _service = service ?? throw new ArgumentNullException(nameof(service));
        }

        [HttpGet("{applicationId:guid}")]
        [ProducesResponseType(typeof(IReadOnlyList<PgEducationDetailDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetByApplicationId(Guid applicationId)
        {
            var result = await _service.GetByApplicationIdAsync(applicationId);
            return Ok(result);
        }

        [HttpPost("exam")]
        [ProducesResponseType(typeof(PgEducationDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SaveTraditionalExam([FromBody] SaveTraditionalExamRequest request)
        {
            try
            {
                var result = await _service.SaveTraditionalExamAsync(request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpDelete("exam/{pgEducationDetailId:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteExam(Guid pgEducationDetailId)
        {
            try
            {
                await _service.DeleteExamAsync(pgEducationDetailId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { error = ex.Message });
            }
        }

        [HttpPost("degree-marks")]
        [ProducesResponseType(typeof(PgEducationDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SaveDegreeMarks([FromBody] SaveDegreeMarksRequest request)
        {
            try
            {
                var result = await _service.SaveDegreeMarksAsync(request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpDelete("degree-marks/{applicationId:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteDegreeMarks(Guid applicationId)
        {
            try
            {
                await _service.DeleteDegreeMarksAsync(applicationId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { error = ex.Message });
            }
        }
    }
}
