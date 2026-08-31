using Microsoft.AspNetCore.Mvc;
using UniversitySystem.Application.Dtos;
using UniversitySystem.Application.Interfaces;

namespace UniversitySystem.Api.Controllers
{

    [ApiController]
    [Route("api/support-tickets")]
    public class SupportTicketsController : ControllerBase
    {
        private readonly ISupportTicketService _service;

        public SupportTicketsController(ISupportTicketService service) => _service = service;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? username)
        {
            var result = string.IsNullOrWhiteSpace(username)
                ? await _service.GetAllAsync()
                : await _service.GetByUsernameAsync(username);
            return Ok(result);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var ticket = await _service.GetByIdAsync(id);
            return ticket is null ? NotFound() : Ok(ticket);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSupportTicketDto dto)
        {
            var created = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id:guid}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateSupportTicketStatusDto dto)
        {
            var performedBy = User.Identity?.Name ?? "system";
            var updated = await _service.UpdateStatusAsync(id, dto, performedBy);
            return updated is null ? NotFound() : Ok(updated);
        }

        [HttpPost("messages")]
        public async Task<IActionResult> AddMessage([FromBody] CreateSupportTicketMessageDto dto)
        {
            var performedBy = User.Identity?.Name ?? dto.SenderName ?? "system";
            var message = await _service.AddMessageAsync(dto, performedBy);
            return message is null ? NotFound() : Ok(message);
        }

        [HttpPut("messages/{id:guid}")]
        public async Task<IActionResult> UpdateMessage(Guid id, [FromBody] UpdateSupportTicketMessageDto dto)
        {
            var performedBy = User.Identity?.Name ?? dto.UpdatedBy ?? "system";
            var updated = await _service.UpdateMessageAsync(id, dto, performedBy);
            return updated is null ? NotFound() : Ok(updated);
        }
    }
}