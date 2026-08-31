using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Domain.Entities;

namespace UniversitySystem.Domain.Interfaces
{
    public interface ISupportTicketRepository
    {
        Task<SupportTicket?> GetByIdAsync(Guid id);
        Task<SupportTicket?> GetByIdWithMessagesAsync(Guid id);
        Task<IEnumerable<SupportTicket>> GetAllAsync();
        Task<IEnumerable<SupportTicket>> GetByUsernameAsync(string username);
        Task<string?> GetLastTicketNoAsync(string date, string orgCode);
        Task<Guid?> GetLookupIdAsync(string type, string code);
        Task AddAsync(SupportTicket ticket);
        void Update(SupportTicket ticket);
        Task<int> SaveChangesAsync();
    }
}
