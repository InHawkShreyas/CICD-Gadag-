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
    public class AdmissionFeeConditionalChargeRepository : IAdmissionFeeConditionalChargeRepository
    {
        private readonly AppDbContext _db;
        public AdmissionFeeConditionalChargeRepository(AppDbContext db) => _db = db;

        public async Task<List<AdmissionFeeConditionalCharge>> GetAllAsync() =>
            await _db.AdmissionFeeConditionalCharges
                .Include(x => x.Condition)
                .OrderBy(x => x.ParticularName)
                .ToListAsync();

        public async Task<AdmissionFeeConditionalCharge?> GetByIdAsync(Guid id) =>
            await _db.AdmissionFeeConditionalCharges
                .Include(x => x.Condition)
                .FirstOrDefaultAsync(x => x.Id == id);

        public async Task AddAsync(AdmissionFeeConditionalCharge entity) =>
            await _db.AdmissionFeeConditionalCharges.AddAsync(entity);

        public void Update(AdmissionFeeConditionalCharge entity) =>
            _db.AdmissionFeeConditionalCharges.Update(entity);

        public void Delete(AdmissionFeeConditionalCharge entity) =>
            _db.AdmissionFeeConditionalCharges.Remove(entity);

        public async Task SaveChangesAsync() => await _db.SaveChangesAsync();
    }
}
