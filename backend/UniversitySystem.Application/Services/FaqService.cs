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
    public class FaqService : IFaqService
    {
        private readonly IFaqRepository _faqRepo;

        public FaqService(IFaqRepository faqRepo) => _faqRepo = faqRepo;

        public async Task<IEnumerable<FaqDto>> GetAllAsync(bool includeInactive)
        {
            var faqs = await _faqRepo.GetAllAsync(includeInactive);
            return faqs.Select(MapToDto);
        }

        public async Task<FaqDto?> GetByIdAsync(Guid id)
        {
            var faq = await _faqRepo.GetByIdAsync(id);
            return faq is null ? null : MapToDto(faq);
        }

        public async Task<FaqDto> CreateAsync(CreateFaqDto dto, string performedBy)
        {
            var faq = new Faq
            {
                Category = dto.Category,
                Question = dto.Question,
                Answer = dto.Answer,
                Status = true,
                InsertBy = string.IsNullOrWhiteSpace(dto.InsertBy)? performedBy: dto.InsertBy,
            };
            await _faqRepo.AddAsync(faq);
            await _faqRepo.SaveChangesAsync();
            return MapToDto(faq);
        }

        public async Task<FaqDto?> UpdateAsync(Guid id, UpdateFaqDto dto, string performedBy)
        {
            var faq = await _faqRepo.GetByIdAsync(id);
            if (faq is null) return null;

            faq.Category = dto.Category;
            faq.Question = dto.Question;
            faq.Answer = dto.Answer;
            faq.UpdateBy = string.IsNullOrWhiteSpace(dto.UpdateBy)? performedBy : dto.UpdateBy;
            faq.UpdateOn = DateTime.UtcNow;

            _faqRepo.Update(faq);
            await _faqRepo.SaveChangesAsync();
            return MapToDto(faq);
        }

        public async Task<bool> ToggleActiveAsync(Guid id, string performedBy)
        {
            var faq = await _faqRepo.GetByIdAsync(id);
            if (faq is null) return false;

            faq.Status = !faq.Status;
            faq.UpdateBy = performedBy;
            faq.UpdateOn = DateTime.UtcNow;

            _faqRepo.Update(faq);
            await _faqRepo.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(Guid id, string performedBy)
        {
            var faq = await _faqRepo.GetByIdAsync(id);
            if (faq is null) return false;

            faq.UpdateBy = performedBy;
            faq.UpdateOn = DateTime.UtcNow;
            _faqRepo.Remove(faq);
            await _faqRepo.SaveChangesAsync();
            return true;
        }

        private static FaqDto MapToDto(Faq f) => new()
        {
            Id = f.Id,
            Category = f.Category,
            Question = f.Question,
            Answer = f.Answer,
            Active = f.Status,
            InsertBy = f.InsertBy,
            InsertOn = f.InsertOn,
        };
    }
}
