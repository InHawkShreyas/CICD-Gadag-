using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Application.Dtos;
using UniversitySystem.Application.Interfaces;
using UniversitySystem.Domain.Interfaces;

namespace UniversitySystem.Application.Services
{
    public class ExamFeeService : IExamFeeService
    {
        private readonly IExamFeeRepository _repo;
        private readonly ICurrentUserService _currentUser;
        private readonly IAuditLogService _auditLog;

        public ExamFeeService(
            IExamFeeRepository repo,
            ICurrentUserService currentUser,
            IAuditLogService auditLog)
        {
            _repo = repo;
            _currentUser = currentUser;
            _auditLog = auditLog;
        }

        public async Task<object> UpsertAsync(ExamFeeUpsertDto dto)
        {
            var username = _currentUser.Username ?? "system";

            if (dto.Id.HasValue)
            {
                var existing = await _repo.GetByIdAsync(dto.Id.Value);

                if (existing != null)
                {
                    existing.DegreeId = dto.DegreeId ?? existing.DegreeId;
                    existing.CourseId = dto.CourseId ?? existing.CourseId;
                    existing.AcademicYearId = dto.AcademicYearId ?? existing.AcademicYearId;

                    existing.StartDate = dto.StartDate ?? existing.StartDate;
                    existing.EndDate = dto.EndDate ?? existing.EndDate;
                    existing.FineEndDate = dto.FineEndDate ?? existing.FineEndDate;

                    existing.ExamFeeAmount = dto.ExamFeeAmount ?? existing.ExamFeeAmount;
                    existing.FineAmount = dto.FineAmount ?? existing.FineAmount;
                    existing.PlatformCharges = dto.PlatformCharges ?? existing.PlatformCharges;
                    existing.TotalAmount = dto.TotalAmount ?? existing.TotalAmount;

                    existing.Status = dto.Status ?? existing.Status;

                    existing.UpdateBy = username;
                    existing.UpdateOn = DateTime.UtcNow;

                    await _repo.UpdateAsync(existing);

                    return new
                    {
                        Success = true,
                        Message = "Exam Fee updated successfully"
                    };
                }
            }

            var entity = new ExamFee
            {
                Id = Guid.NewGuid(),

                DegreeId = dto.DegreeId,
                CourseId = dto.CourseId,
                AcademicYearId = dto.AcademicYearId,

                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                FineEndDate = dto.FineEndDate,

                ExamFeeAmount = dto.ExamFeeAmount ?? 0,
                FineAmount = dto.FineAmount ?? 0,
                PlatformCharges = dto.PlatformCharges ?? 0,
                TotalAmount = dto.TotalAmount ?? 0,

                Status = dto.Status ?? true,

                InsertBy = username,
                InsertOn = DateTime.UtcNow
            };

            await _repo.CreateAsync(entity);

            return new
            {
                Success = true,
                Message = "Exam Fee created successfully"
            };
        }

        public async Task<List<ExamFeeResponseDto>> GetAllAsync()
        {
            var entities = await _repo.GetAllAsync();
            return entities.Select(ExamFeeResponseDto.FromEntity).ToList();
        }

        public async Task<ExamFeeResponseDto?> GetByIdAsync(Guid id)
        {
            var entity = await _repo.GetByIdAsync(id);
            return entity == null ? null : ExamFeeResponseDto.FromEntity(entity);
        }
    }
}
