using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Application.Dtos;

namespace UniversitySystem.Application.Interfaces
{
    public interface ISupportTicketService
    {
        Task<IEnumerable<SupportTicketDto>> GetAllAsync();
        Task<IEnumerable<SupportTicketDto>> GetByUsernameAsync(string username);
        Task<SupportTicketDetailDto?> GetByIdAsync(Guid id);
        Task<SupportTicketDetailDto> CreateAsync(CreateSupportTicketDto dto);
        Task<SupportTicketDetailDto?> UpdateStatusAsync(Guid id, UpdateSupportTicketStatusDto dto, string performedBy);
        Task<SupportTicketMessageDto?> AddMessageAsync(CreateSupportTicketMessageDto dto, string performedBy);
        Task<SupportTicketMessageDto?> UpdateMessageAsync(Guid messageId, UpdateSupportTicketMessageDto dto, string performedBy);
    }
}
