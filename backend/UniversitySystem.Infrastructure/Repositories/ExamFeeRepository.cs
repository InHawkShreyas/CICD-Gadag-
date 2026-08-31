using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Domain.Interfaces;
using UniversitySystem.Infrastructure.Data;

namespace UniversitySystem.Infrastructure.Repositories
{
    public class ExamFeeRepository : IExamFeeRepository
    {
        private readonly AppDbContext _context;

        public ExamFeeRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<ExamFee> CreateAsync(ExamFee entity)
        {
            _context.ExamFees.Add(entity);

            await _context.SaveChangesAsync();

            return entity;
        }

        public async Task<List<ExamFee>> GetAllAsync()
        {
            return await _context.ExamFees.ToListAsync();
        }

        public async Task<ExamFee?> GetByIdAsync(Guid id)
        {
            return await _context.ExamFees
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<bool> UpdateAsync(ExamFee entity)
        {
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
