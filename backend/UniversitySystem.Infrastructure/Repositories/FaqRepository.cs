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
    public class FaqRepository : IFaqRepository
    {
        private readonly AppDbContext _context;

        public FaqRepository(AppDbContext context) => _context = context;

        public Task<Faq?> GetByIdAsync(Guid id) =>
            _context.Set<Faq>().FirstOrDefaultAsync(f => f.Id == id);

        public async Task<IEnumerable<Faq>> GetAllAsync(bool includeInactive) =>
            await _context.Set<Faq>()
                .Where(f => includeInactive || f.Status)
                .OrderBy(f => f.Category)
                .ToListAsync();

        public Task AddAsync(Faq faq) => _context.Set<Faq>().AddAsync(faq).AsTask();

        public void Update(Faq faq) => _context.Set<Faq>().Update(faq);

        public void Remove(Faq faq)
        {
            faq.Status = false; // soft-delete — same flag now doubles as "inactive"
            _context.Set<Faq>().Update(faq);
        }

        public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();
    }
}
