using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Application.Dtos;
using UniversitySystem.Application.Interfaces;
using UniversitySystem.Domain.Entities;
using UniversitySystem.Domain.Interfaces;

namespace UniversitySystem.Application.Services
{
    public class AdmissionFeeConditionalChargeService : IAdmissionFeeConditionalChargeService
    {
        private readonly IAdmissionFeeConditionalChargeRepository _repo;

        public AdmissionFeeConditionalChargeService(IAdmissionFeeConditionalChargeRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<AdmissionFeeConditionalChargeDto>> GetAllAsync()
        {
            var entities = await _repo.GetAllAsync();
            return entities.Select(MapToDto).ToList();
        }

        public async Task<AdmissionFeeConditionalChargeDto?> GetByIdAsync(Guid id)
        {
            var entity = await _repo.GetByIdAsync(id);
            return entity == null ? null : MapToDto(entity);
        }

        public async Task<AdmissionFeeConditionalChargeDto> CreateAsync(
            AdmissionFeeConditionalChargeCreateUpdateDto dto, string user)
        {
            var entity = new AdmissionFeeConditionalCharge
            {
                Id = Guid.NewGuid(),
                ConditionId = dto.ConditionId,
                ParticularName = dto.ParticularName,
                Amount = dto.Amount,
                Description = dto.Description,
                Status = dto.Status,
                InsertBy = user,
                InsertOn = DateTime.UtcNow
            };

            await _repo.AddAsync(entity);
            await _repo.SaveChangesAsync();

            var saved = await _repo.GetByIdAsync(entity.Id);
            return MapToDto(saved!);
        }

        public async Task<bool> UpdateAsync(AdmissionFeeConditionalChargeCreateUpdateDto dto, string user)
        {
            if (dto.Id == null) return false;
            var entity = await _repo.GetByIdAsync(dto.Id.Value);
            if (entity == null) return false;

            entity.ConditionId = dto.ConditionId;
            entity.ParticularName = dto.ParticularName;
            entity.Amount = dto.Amount;
            entity.Description = dto.Description;
            entity.Status = dto.Status;
            entity.UpdateBy = user;
            entity.UpdateOn = DateTime.UtcNow;

            _repo.Update(entity);
            await _repo.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var entity = await _repo.GetByIdAsync(id);
            if (entity == null) return false;

            _repo.Delete(entity);
            await _repo.SaveChangesAsync();
            return true;
        }

        private static AdmissionFeeConditionalChargeDto MapToDto(AdmissionFeeConditionalCharge e) =>new()
        {
            Id = e.Id,
            ConditionId = e.ConditionId,
            ConditionCode = e.Condition?.Type2,
            ConditionName = e.Condition?.Name,
            ParticularName = e.ParticularName,
            Amount = e.Amount,
            Description = e.Description,
            Status = e.Status
        };
    }
}
