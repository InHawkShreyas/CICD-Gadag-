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
    public class DocumentCoordinatorRepository : IDocumentCoordinatorRepository
    {
        private readonly AppDbContext _context;
        public DocumentCoordinatorRepository(AppDbContext context)
        {
            _context = context;
        }
        public async Task<IEnumerable<DocumentCoordinatorMapping>> AddAsync(IEnumerable<DocumentCoordinatorMapping> entities)
        {
            await _context.DocumentCoordinatorMappings.AddRangeAsync(entities);
            await _context.SaveChangesAsync();
            return entities;
        }
        public async Task<DocumentCoordinatorMapping?> GetByIdAsync(Guid id)
        {
            return await _context.DocumentCoordinatorMappings
                .Include(x => x.Login)
                .Include(x => x.DegreeType)
                .Include(x => x.Degree)
                .Include(x => x.Course)
                .FirstOrDefaultAsync(x => x.Id == id);
        }
        public async Task<IEnumerable<DocumentCoordinatorMapping>> GetAllAsync()
        {
            return await _context.DocumentCoordinatorMappings
                .Include(x => x.Login)
                .Include(x => x.DegreeType)
                .Include(x => x.Degree)
                .Include(x => x.Course)
                .OrderBy(x => x.InsertOn)
                .ToListAsync();
        }
        public async Task<DocumentCoordinatorMapping?> UpdateAsync(DocumentCoordinatorMapping entity)
        {
            var existing = await _context.DocumentCoordinatorMappings
                .FirstOrDefaultAsync(x => x.Id == entity.Id);
            if (existing == null)
                return null;
            existing.LoginId = entity.LoginId;
            existing.DegreeTypeId = entity.DegreeTypeId;
            existing.DegreeId = entity.DegreeId;
            existing.CourseId = entity.CourseId;
            existing.Status = entity.Status;
            existing.UpdateBy = entity.UpdateBy;
            existing.UpdateOn = entity.UpdateOn;
            await _context.SaveChangesAsync();
            return existing;
        }
        public async Task<bool> SoftDeleteAsync(Guid id, string updatedBy)
        {
            var entity = await _context.DocumentCoordinatorMappings
                .FirstOrDefaultAsync(x => x.Id == id && x.Status);
            if (entity == null)
                return false;
            entity.Status = false;
            entity.UpdateBy = updatedBy;
            entity.UpdateOn = DateTime.UtcNow;
            _context.DocumentCoordinatorMappings.Update(entity);
            await _context.SaveChangesAsync();
            return true;
        }
        public async Task<bool> ExistsAsync(
    Guid loginId,
    Guid? degreeTypeId,
    Guid degreeId,
    Guid courseId,
    Guid? excludeId = null)
        {
            var query = _context.DocumentCoordinatorMappings
                .Where(x =>
                    x.Status &&
                    x.LoginId == loginId &&
                    x.DegreeTypeId == degreeTypeId &&
                    x.DegreeId == degreeId &&
                    x.CourseId == courseId);
            if (excludeId.HasValue)
            {
                query = query.Where(x => x.Id != excludeId.Value);
            }
            return await query.AnyAsync();
        }
    }
}