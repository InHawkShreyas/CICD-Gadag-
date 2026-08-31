using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UniversitySystem.Application.Dtos;
using UniversitySystem.Application.Interfaces;
using UniversitySystem.Domain.Entities;
using UniversitySystem.Domain.Interfaces;

namespace UniversitySystem.Application.Services
{
    public class ApplicationFeeService : IApplicationFeeService
    {
        private readonly IApplicationFeeRepository _repository;

        public ApplicationFeeService(IApplicationFeeRepository repository)
        {
            _repository = repository;
        }

        public async Task<ApplicationFeeResponseDto> UpsertAsync(ApplicationFeeUpsertDto dto)
        {
            var entity = new ApplicationFee
            {
                Id = dto.Id ?? Guid.NewGuid(),
                DegreeTypeId = dto.DegreeTypeId,
                DegreeId = dto.DegreeId,
                CourseId = dto.CourseId,
                BatchTypeId = dto.BatchTypeId,
                AcademicYearId = dto.AcademicYearId,
                CategoryId = dto.CategoryId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Amount = dto.Amount,
                PlatformCharges = dto.PlatformCharges,
                TotalAmount = dto.TotalAmount ?? (dto.Amount + dto.PlatformCharges),
                Status = dto.Status
            };

            var saved = await _repository.UpsertAsync(entity);
            return MapToDto(saved);
        }

        public async Task<IEnumerable<ApplicationFeeResponseDto>> BulkUpsertAsync(ApplicationFeeBulkUpsertDto dto)
        {
            if (dto.DegreeIds == null || dto.DegreeIds.Count == 0)
                throw new ArgumentException("Select at least one degree.", nameof(dto.DegreeIds));
            if (dto.CourseIds == null || dto.CourseIds.Count == 0)
                throw new ArgumentException("Select at least one course.", nameof(dto.CourseIds));
            if (dto.DegreeTypeIds == null || dto.DegreeTypeIds.Count == 0)
                throw new ArgumentException("Select at least one degree type.", nameof(dto.DegreeTypeIds));
            if (dto.AcademicYearIds == null || dto.AcademicYearIds.Count == 0)
                throw new ArgumentException("Select at least one academic year.", nameof(dto.AcademicYearIds));
            if (dto.CategoryIds == null || dto.CategoryIds.Count == 0)
                throw new ArgumentException("Select at least one category.", nameof(dto.CategoryIds));

            var batchTypeIds = dto.BatchTypeIds != null && dto.BatchTypeIds.Any()
                ? dto.BatchTypeIds.Cast<Guid?>().Distinct()
                : new List<Guid?> { null };

            var totalAmount = dto.TotalAmount ?? (dto.Amount + dto.PlatformCharges);
            var entities = (
                from degreeId in dto.DegreeIds.Distinct()
                from courseId in dto.CourseIds.Distinct()
                from degreeTypeId in dto.DegreeTypeIds.Distinct()
                from batchTypeId in batchTypeIds
                from yearId in dto.AcademicYearIds.Distinct()
                from categoryId in dto.CategoryIds.Distinct()
                select new ApplicationFee
                {
                    Id = Guid.NewGuid(),
                    DegreeId = degreeId,
                    CourseId = courseId,
                    DegreeTypeId = degreeTypeId,
                    BatchTypeId = batchTypeId,
                    AcademicYearId = yearId,
                    CategoryId = categoryId,
                    StartDate = dto.StartDate,
                    EndDate = dto.EndDate,
                    Amount = dto.Amount,
                    PlatformCharges = dto.PlatformCharges,
                    TotalAmount = totalAmount,
                    Status = true
                }
            ).ToList();

            var saved = await _repository.BulkInsertAsync(entities);
            return saved.Select(MapToDto);
        }

        public async Task<ApplicationFeeResponseDto?> GetByIdAsync(Guid id)
        {
            var entity = await _repository.GetByIdAsync(id);
            return entity == null ? null : MapToDto(entity);
        }

        public async Task<IEnumerable<ApplicationFeeResponseDto>> GetAllAsync(bool? isActive = null)
        {
            var entities = await _repository.GetAllAsync(isActive);
            return entities.Select(MapToDto);
        }

        private static ApplicationFeeResponseDto MapToDto(ApplicationFee entity)
        {
            return new ApplicationFeeResponseDto
            {
                Id = entity.Id,
                DegreeTypeId = entity.DegreeTypeId,
                DegreeTypeName = entity.DegreeType?.Name,
                DegreeId = entity.DegreeId,
                DegreeName = entity.Degree?.DegreeName,
                CourseId = entity.CourseId,
                BatchTypeId = entity.BatchTypeId,
                BatchTypeName = entity.BatchType?.Name,
                CourseName = entity.Course?.Name,
                AcademicYearId = entity.AcademicYearId,
                AcademicYearName = entity.AcademicYear?.Description,
                CategoryId = entity.CategoryId,
                CategoryName = entity.Category?.Name,
                StartDate = entity.StartDate,
                EndDate = entity.EndDate,
                Amount = entity.Amount,
                PlatformCharges = entity.PlatformCharges,
                TotalAmount = entity.TotalAmount,
                IsActive = entity.Status,
                CreatedAt = entity.InsertOn,
                UpdatedAt = entity.UpdateOn
            };
        }
    }
}