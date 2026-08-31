using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Application.Dtos.Application;
using UniversitySystem.Application.Interfaces.Application;
using UniversitySystem.Domain.Entities;
using UniversitySystem.Domain.Interfaces.Application;

namespace UniversitySystem.Application.Services.Application
{
    public class PgEducationService : IPgEducationService
    {
        private static readonly HashSet<string> AllowedTraditionalLevels =
            new(StringComparer.OrdinalIgnoreCase)
            {
                "10th", "12th", "Diploma",
                "Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6"
            };

        private static readonly HashSet<string> AllowedEntryModes =
            new(StringComparer.OrdinalIgnoreCase) { "sem", "year" };

        private const string DegreeMarksLevel = "Degree Marks";

        private readonly IPgEducationDetailRepository _detailRepository;
        private readonly IPgEducationPeriodRepository _periodRepository;

        public PgEducationService(
            IPgEducationDetailRepository detailRepository,
            IPgEducationPeriodRepository periodRepository)
        {
            _detailRepository = detailRepository ?? throw new ArgumentNullException(nameof(detailRepository));
            _periodRepository = periodRepository ?? throw new ArgumentNullException(nameof(periodRepository));
        }

        public async Task<IReadOnlyList<PgEducationDetailDto>> GetByApplicationIdAsync(Guid applicationId)
        {
            var details = await _detailRepository.GetByApplicationIdAsync(applicationId);
            return details.Select(MapToDto).ToList();
        }
        public async Task<List<PgEducationDetailDto>> GetAllAsync()
        {
            var details = await _detailRepository.GetAllAsync();
            return details.Select(MapToDtoLight).ToList();
        }

        // Lightweight mapper for bulk fetches — avoids touching entity.Periods,
        // which may not be loaded when GetAllAsync doesn't Include() them.
        private static PgEducationDetailDto MapToDtoLight(PgEducationDetail entity)
        {
            return new PgEducationDetailDto
            {
                Id = entity.Id,
                ApplicationId = entity.ApplicationId,
                AppNo = entity.AppNo,
                ExamLevel = entity.ExamLevel,
                InstituteName = entity.InstituteName,
                RegistrationNumber = entity.RegistrationNumber,
                Year = entity.Year,
                MaxMarks = entity.MaxMarks,
                ObtainedMarks = entity.ObtainedMarks,
                Percentage = entity.Percentage,
                Cgpa = entity.Cgpa,
                SameInstitution = entity.SameInstitution,
                EntryMode = entity.EntryMode,
                UgSubject = entity.UgSubject,
                OverallPercentage = entity.OverallPercentage,
                Periods = new List<PgEducationPeriodDto>()
            };
        }

        public async Task<PgEducationDetailDto> SaveTraditionalExamAsync(SaveTraditionalExamRequest request)
        {
            if (!AllowedTraditionalLevels.Contains(request.ExamLevel))
            {
                throw new ArgumentException(
                    $"ExamLevel must be one of: {string.Join(", ", AllowedTraditionalLevels)}",
                    nameof(request.ExamLevel));
            }

            var existing = (await _detailRepository.GetByApplicationIdAsync(request.ApplicationId, includePeriods: false))
                .FirstOrDefault(d => string.Equals(d.ExamLevel, request.ExamLevel, StringComparison.OrdinalIgnoreCase));

            if (existing is null)
            {
                var entity = new PgEducationDetail
                {
                    Id = Guid.NewGuid(),
                    ApplicationId = request.ApplicationId,
                    AppNo = request.AppNo,
                    ExamLevel = request.ExamLevel,
                    InstituteName = request.InstituteName,
                    RegistrationNumber = request.RegistrationNumber,
                    Year = request.Year,
                    MaxMarks = request.MaxMarks,
                    ObtainedMarks = request.ObtainedMarks,
                    Percentage = request.Percentage,
                    Cgpa = request.Cgpa,
                    UgSubject = request.UgSubject,
                    InsertOn = DateTime.UtcNow,
                    Status = true
                };

                await _detailRepository.AddAsync(entity);
                await _detailRepository.SaveChangesAsync();
                return MapToDto(entity);
            }

            existing.AppNo = request.AppNo;
            existing.InstituteName = request.InstituteName;
            existing.RegistrationNumber = request.RegistrationNumber;
            existing.Year = request.Year;
            existing.MaxMarks = request.MaxMarks;
            existing.ObtainedMarks = request.ObtainedMarks;
            existing.Percentage = request.Percentage;
            existing.Cgpa = request.Cgpa;
            existing.UgSubject = request.UgSubject;
            existing.UpdateOn = DateTime.UtcNow;

            _detailRepository.Update(existing);
            await _detailRepository.SaveChangesAsync();
            return MapToDto(existing);
        }

        public async Task<PgEducationDetailDto> SaveDegreeMarksAsync(SaveDegreeMarksRequest request)
        {
            if (!AllowedEntryModes.Contains(request.EntryMode))
            {
                throw new ArgumentException("EntryMode must be 'sem' or 'year'.", nameof(request.EntryMode));
            }

            if (request.Periods.Count == 0)
            {
                throw new ArgumentException("Degree Marks must include at least one period.", nameof(request.Periods));
            }

            if (request.Periods.Any(p => !string.Equals(p.PeriodType, request.EntryMode, StringComparison.OrdinalIgnoreCase)))
            {
                throw new ArgumentException("Every period's PeriodType must match the parent EntryMode.");
            }

            if (!request.SameInstitution && request.Periods.Any(p => string.IsNullOrWhiteSpace(p.InstituteName)))
            {
                throw new ArgumentException("InstituteName is required on every period when SameInstitution is false.");
            }

            var existing = await _detailRepository.GetDegreeMarksByApplicationIdAsync(request.ApplicationId);

            PgEducationDetail detail;
            if (existing is null)
            {
                detail = new PgEducationDetail
                {
                    Id = Guid.NewGuid(),
                    ApplicationId = request.ApplicationId,
                    AppNo = request.AppNo,
                    ExamLevel = DegreeMarksLevel,
                    InsertOn = DateTime.UtcNow,
                    Status = true
                };
                await _detailRepository.AddAsync(detail);
            }
            else
            {
                detail = existing;
                detail.AppNo = request.AppNo;
                detail.UpdateOn = DateTime.UtcNow;

                if (existing.Periods.Count > 0)
                {
                    _periodRepository.RemoveRange(existing.Periods);
                }

                _detailRepository.Update(detail);
            }

            detail.SameInstitution = request.SameInstitution;
            detail.EntryMode = request.EntryMode;
            detail.Year = request.Year;
            detail.InstituteName = request.SameInstitution ? request.InstituteName : null;
            detail.RegistrationNumber = request.SameInstitution ? request.RegistrationNumber : null;
            detail.UgSubject = request.UgSubject;
            detail.OverallPercentage = request.OverallPercentage;

            // Persist the parent first so its Id is available for new period FKs.
            await _detailRepository.SaveChangesAsync();

            var newPeriods = request.Periods.Select(p => new PgEducationPeriod
            {
                Id = Guid.NewGuid(),
                PgEducationDetailId = detail.Id,
                PeriodType = p.PeriodType,
                PeriodIndex = p.PeriodIndex,
                InstituteName = request.SameInstitution ? null : p.InstituteName,
                RegistrationNumber = request.SameInstitution ? null : p.RegistrationNumber,
                Sgpa = p.Sgpa,
                Percentage = p.Percentage,
                Cgpa = p.Cgpa,
                MaxMarks=p.MaxMarks,
                ObtainedMarks=p.ObtainedMarks,
                InsertOn = DateTime.UtcNow,
                Status = true
            }).ToList();

            await _periodRepository.AddRangeAsync(newPeriods);
            await _periodRepository.SaveChangesAsync();

            detail.Periods = newPeriods;
            return MapToDto(detail);
        }

        public async Task DeleteExamAsync(Guid pgEducationDetailId)
        {
            var detail = await _detailRepository.GetByIdAsync(pgEducationDetailId);
            if (detail is null)
            {
                throw new KeyNotFoundException($"PgEducationDetail '{pgEducationDetailId}' not found.");
            }

            _detailRepository.Remove(detail);
            await _detailRepository.SaveChangesAsync();
        }

        public async Task DeleteDegreeMarksAsync(Guid applicationId)
        {
            var detail = await _detailRepository.GetDegreeMarksByApplicationIdAsync(applicationId);
            if (detail is null)
            {
                throw new KeyNotFoundException($"No Degree Marks record found for application '{applicationId}'.");
            }

            if (detail.Periods.Count > 0)
            {
                _periodRepository.RemoveRange(detail.Periods);
                await _periodRepository.SaveChangesAsync();
            }

            _detailRepository.Remove(detail);
            await _detailRepository.SaveChangesAsync();
        }

        private static PgEducationDetailDto MapToDto(PgEducationDetail entity)
        {
            return new PgEducationDetailDto
            {
                Id = entity.Id,
                ApplicationId = entity.ApplicationId,
                AppNo = entity.AppNo,
                ExamLevel = entity.ExamLevel,
                InstituteName = entity.InstituteName,
                RegistrationNumber = entity.RegistrationNumber,
                Year = entity.Year,
                MaxMarks = entity.MaxMarks,
                ObtainedMarks = entity.ObtainedMarks,
                Percentage = entity.Percentage,
                Cgpa = entity.Cgpa,
                SameInstitution = entity.SameInstitution,
                EntryMode = entity.EntryMode,
                UgSubject = entity.UgSubject,
                OverallPercentage = entity.OverallPercentage,
                Periods = entity.Periods.Select(p => new PgEducationPeriodDto
                {
                    Id = p.Id,
                    PeriodType = p.PeriodType,
                    PeriodIndex = p.PeriodIndex,
                    InstituteName = p.InstituteName,
                    RegistrationNumber = p.RegistrationNumber,
                    Sgpa = p.Sgpa,
                    Percentage = p.Percentage,
                    Cgpa = p.Cgpa,
                    MaxMarks=p.MaxMarks,
                    ObtainedMarks=p.ObtainedMarks
                }).OrderBy(p => p.PeriodIndex).ToList()
            };
        }
    }
}