using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Domain.Entities;
using UniversitySystem.Domain.Interfaces.Application;
using UniversitySystem.Infrastructure.Data;
namespace UniversitySystem.Infrastructure.Repositories.Application
{
    public class PgEducationPeriodRepository : IPgEducationPeriodRepository
    {
        private readonly AppDbContext _context;
        public PgEducationPeriodRepository(AppDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }
        public async Task<IReadOnlyList<PgEducationPeriod>> GetByDetailIdAsync(Guid pgEducationDetailId)
        {
            return await _context.PgEducationPeriods
                .Where(p => p.PgEducationDetailId == pgEducationDetailId && p.Status == true)
                .OrderBy(p => p.PeriodIndex)
                .ToListAsync();
        }
        public async Task AddRangeAsync(IEnumerable<PgEducationPeriod> periods)
        {
            await _context.PgEducationPeriods.AddRangeAsync(periods);
        }
        public void RemoveRange(IEnumerable<PgEducationPeriod> periods)
        {
            _context.PgEducationPeriods.RemoveRange(periods);
        }
        public async Task<int> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync();
        }
    }
}