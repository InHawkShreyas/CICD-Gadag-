using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Domain.Entities;
using UniversitySystem.Domain.Interfaces;
using UniversitySystem.Infrastructure.Data;

namespace UniversitySystem.Infrastructure.Repositories
{
    public class SupportTicketMessageRepository : ISupportTicketMessageRepository
    {
        private readonly AppDbContext _context;

        public SupportTicketMessageRepository(AppDbContext context) => _context = context;

        public async Task<IEnumerable<SupportTicketMessage>> GetByTicketIdAsync(Guid ticketId) =>
            await _context.Set<SupportTicketMessage>()
                .Where(m => m.Status && m.TicketId == ticketId)
                .OrderBy(m => m.InsertOn)
                .ToListAsync();

        public async Task<SupportTicketMessage?> GetByIdAsync(Guid id) =>
            await _context.Set<SupportTicketMessage>()
                .FirstOrDefaultAsync(m => m.Id == id);

        public void Update(SupportTicketMessage message) =>
            _context.Set<SupportTicketMessage>().Update(message);

        public Task AddAsync(SupportTicketMessage message) =>
            _context.Set<SupportTicketMessage>().AddAsync(message).AsTask();

        public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();
    }
}