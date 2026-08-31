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
    public class SupportTicketRepository : ISupportTicketRepository
    {
        private readonly AppDbContext _context;

        public SupportTicketRepository(AppDbContext context) => _context = context;

        public Task<SupportTicket?> GetByIdAsync(Guid id) =>
            _context.Set<SupportTicket>()
                .Include(t => t.Issue)
                .Include(t => t.StatusLookup)
                .FirstOrDefaultAsync(t => t.Id == id && t.Status);

        public Task<SupportTicket?> GetByIdWithMessagesAsync(Guid id) =>
            _context.Set<SupportTicket>()
                .Include(t => t.Issue)
                .Include(t => t.StatusLookup)
                .Include(t => t.Messages.Where(m => m.Status).OrderBy(m => m.InsertOn))
                .FirstOrDefaultAsync(t => t.Id == id && t.Status);

        public async Task<IEnumerable<SupportTicket>> GetAllAsync() =>
            await _context.Set<SupportTicket>()
                .Include(t => t.Issue)
                .Include(t => t.StatusLookup)
                .Where(t => t.Status)
                .OrderByDescending(t => t.InsertOn)
                .ToListAsync();

        public async Task<IEnumerable<SupportTicket>> GetByUsernameAsync(string username) =>
            await _context.Set<SupportTicket>()
                .Include(t => t.Issue)
                .Include(t => t.StatusLookup)
                .Where(t => t.Status && t.Username == username)
                .OrderByDescending(t => t.InsertOn)
                .ToListAsync();

        public Task<string?> GetLastTicketNoAsync(string date, string orgCode) =>
    _context.Set<SupportTicket>()
        .Where(t => t.Status &&
                    t.TicketNo.StartsWith($"SUP-{date}-{orgCode}-"))
        .OrderByDescending(t => t.TicketNo)
        .Select(t => t.TicketNo)
        .FirstOrDefaultAsync();

        public Task<Guid?> GetLookupIdAsync(string type, string code) =>
            _context.Set<Lookup>()
                .Where(l => l.Type == type && l.Code == code && l.Status)
                .Select(l => (Guid?)l.Id)
                .FirstOrDefaultAsync();

        public Task AddAsync(SupportTicket ticket) =>
            _context.Set<SupportTicket>().AddAsync(ticket).AsTask();

        public void Update(SupportTicket ticket) =>
            _context.Set<SupportTicket>().Update(ticket);

        public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();
    }
}
