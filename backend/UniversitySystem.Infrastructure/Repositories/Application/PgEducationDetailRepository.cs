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
    public class PgEducationDetailRepository : IPgEducationDetailRepository
    {
        private readonly AppDbContext _context;
        public PgEducationDetailRepository(AppDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }
        public async Task<PgEducationDetail?> GetByIdAsync(Guid id, bool includePeriods = false)
        {
            IQueryable<PgEducationDetail> query = _context.PgEducationDetails;
            if (includePeriods)
            {
                query = query.Include(d => d.Periods.Where(p => p.Status == true));
            }
            return await query.FirstOrDefaultAsync(d => d.Id == id && d.Status == true);
        }
        public async Task<IReadOnlyList<PgEducationDetail>> GetByApplicationIdAsync(Guid applicationId, bool includePeriods = true)
        {
            IQueryable<PgEducationDetail> query = _context.PgEducationDetails
                .Where(d => d.ApplicationId == applicationId && d.Status == true);
            if (includePeriods)
            {
                query = query.Include(d => d.Periods.Where(p => p.Status == true));
            }
            return await query
                .OrderBy(d => d.ExamLevel)
                .ToListAsync();
        }
        public async Task<PgEducationDetail?> GetDegreeMarksByApplicationIdAsync(Guid applicationId)
        {
            return await _context.PgEducationDetails
                .Include(d => d.Periods.Where(p => p.Status == true))
                .FirstOrDefaultAsync(d =>
                    d.ApplicationId == applicationId &&
                    d.ExamLevel == "Degree Marks" &&
                    d.Status == true);
        }
        public async Task AddAsync(PgEducationDetail detail)
        {
            await _context.PgEducationDetails.AddAsync(detail);
        }
        public void Update(PgEducationDetail detail)
        {
            _context.PgEducationDetails.Update(detail);
        }
        public void Remove(PgEducationDetail detail)
        {
            detail.Status = false;
            detail.UpdateOn = DateTime.UtcNow;
            _context.PgEducationDetails.Update(detail);
        }
        public async Task<int> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync();
        }
        public async Task<List<PgEducationDetail>> GetAllAsync()
        {
            return await _context.PgEducationDetails
                .AsNoTracking()
                .ToListAsync();
        }
    }
}