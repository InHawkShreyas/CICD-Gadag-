using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Domain.Entities;

namespace UniversitySystem.Domain.Interfaces
{
    public interface ISupportTicketMessageRepository
    {
        Task<IEnumerable<SupportTicketMessage>> GetByTicketIdAsync(Guid ticketId);
        Task AddAsync(SupportTicketMessage message);
        Task<int> SaveChangesAsync();
        Task<SupportTicketMessage?> GetByIdAsync(Guid id);
        void Update(SupportTicketMessage message);
    }
}
