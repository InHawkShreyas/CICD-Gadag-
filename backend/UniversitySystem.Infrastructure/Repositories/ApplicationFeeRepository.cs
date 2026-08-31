using Microsoft.EntityFrameworkCore;
using UniversitySystem.Domain.Entities;
using UniversitySystem.Domain.Interfaces;
using UniversitySystem.Infrastructure.Data;
namespace UniversitySystem.Infrastructure.Repositories
{
    public class ApplicationFeeRepository : IApplicationFeeRepository
    {
        private readonly AppDbContext _context;
        public ApplicationFeeRepository(AppDbContext context)
        {
            _context = context;
        }
        public async Task<ApplicationFee> UpsertAsync(ApplicationFee entity)
        {
            if (entity.Id == Guid.Empty)
                entity.Id = Guid.NewGuid();
            var existing = await _context.Set<ApplicationFee>()
                .FirstOrDefaultAsync(x => x.Id == entity.Id);
            if (existing == null)
            {
                await _context.Set<ApplicationFee>().AddAsync(entity);
            }
            else
            {
                existing.DegreeTypeId = entity.DegreeTypeId;
                existing.DegreeId = entity.DegreeId;
                existing.CourseId = entity.CourseId;
                existing.AcademicYearId = entity.AcademicYearId;
                existing.CategoryId = entity.CategoryId;
                existing.BatchTypeId = entity.BatchTypeId;
                existing.StartDate = entity.StartDate;
                existing.EndDate = entity.EndDate;
                existing.Amount = entity.Amount;
                existing.PlatformCharges = entity.PlatformCharges;
                existing.TotalAmount = entity.TotalAmount;
                existing.Status = entity.Status;
                _context.Set<ApplicationFee>().Update(existing);
                entity = existing;
            }
            await _context.SaveChangesAsync();
            return entity;
        }
        public async Task<IEnumerable<ApplicationFee>> BulkInsertAsync(IEnumerable<ApplicationFee> entities)
        {
            var list = entities.ToList();
            await _context.Set<ApplicationFee>().AddRangeAsync(list);
            await _context.SaveChangesAsync();
            return list;
        }
        public async Task<ApplicationFee?> GetByIdAsync(Guid id)
        {
            return await _context.Set<ApplicationFee>()
                .Include(x => x.Degree)
                .Include(x => x.Course)
                .Include(x => x.BatchType)
                .Include(x => x.AcademicYear)
                .Include(x => x.Category)
                .FirstOrDefaultAsync(x => x.Id == id);
        }
        public async Task<IEnumerable<ApplicationFee>> GetAllAsync(bool? isActive = null)
        {
            var query = _context.Set<ApplicationFee>()
                .Include(x => x.Degree)
                .Include(x => x.Course)
                .Include(x => x.BatchType)
                .Include(x => x.AcademicYear)
                .Include(x => x.Category)
                .AsQueryable();
            if (isActive.HasValue)
                query = query.Where(x => x.Status == isActive.Value);
            return await query.OrderByDescending(x => x.InsertOn).ToListAsync();
        }
    }
}