using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Application.Dtos;
using UniversitySystem.Application.Dtos.Application;
using UniversitySystem.Application.Interfaces;
using UniversitySystem.Domain.Entities;
using UniversitySystem.Domain.Interfaces;

namespace UniversitySystem.Application.Services
{
    public class DocumentCoordinatorService : IDocumentCoordinatorService
    {
        private readonly IDocumentCoordinatorRepository _repository;

        public DocumentCoordinatorService(IDocumentCoordinatorRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<DocumentCoordinatorDto>> CreateAsync(
            List<CreateDocumentCoordinatorDto> request)
        {
            if (request == null || !request.Any())
                throw new ArgumentException("Request cannot be empty.");

            var entities = new List<DocumentCoordinatorMapping>();

            foreach (var item in request)
            {
                var exists = await _repository.ExistsAsync(
                    item.LoginId,
                    item.DegreeTypeId,
                    item.DegreeId,
                    item.CourseId);

                if (exists)
                    throw new Exception(
                        "Coordinator mapping already exists.");

                entities.Add(new DocumentCoordinatorMapping
                {
                    LoginId = item.LoginId,
                    DegreeTypeId = item.DegreeTypeId,
                    DegreeId = item.DegreeId,
                    CourseId = item.CourseId,
                    Status = true
                });
            }

            var result = await _repository.AddAsync(entities);

            return result.Select(x => new DocumentCoordinatorDto
            {
                Id = x.Id,
                LoginId = x.LoginId,
                DegreeTypeId = x.DegreeTypeId,
                DegreeId = x.DegreeId,
                CourseId = x.CourseId,
                Status = x.Status
            });
        }

        public async Task<DocumentCoordinatorDto?> GetByIdAsync(Guid id)
        {
            var entity = await _repository.GetByIdAsync(id);

            if (entity == null)
                return null;

            return new DocumentCoordinatorDto
            {
                Id = entity.Id,
                LoginId = entity.LoginId,
                DegreeTypeId = entity.DegreeTypeId,
                DegreeId = entity.DegreeId,
                CourseId = entity.CourseId,
                CoordinatorName = entity.Login?.Registration?.Name,
                Username = entity.Login?.Username,
                DegreeName = entity.Degree?.DegreeName,
                CourseName = entity.Course?.Name,
                Status = entity.Status
            };
        }

        public async Task<IEnumerable<DocumentCoordinatorDto>> GetAllAsync()
        {
            var list = await _repository.GetAllAsync();

            return list.Select(entity => new DocumentCoordinatorDto
            {
                Id = entity.Id,
                LoginId = entity.LoginId,
                DegreeTypeId = entity.DegreeTypeId,
                DegreeId = entity.DegreeId,
                CourseId = entity.CourseId,
                CoordinatorName = entity.Login?.Registration?.Name,
                Username = entity.Login?.Username,
                DegreeName = entity.Degree?.DegreeName,
                CourseName = entity.Course?.Name,
                Status = entity.Status
            });
        }

        public async Task<DocumentCoordinatorDto?> UpdateAsync(
            UpdateDocumentCoordinatorDto request)
        {
            var duplicate = await _repository.ExistsAsync(
                request.LoginId,
                request.DegreeTypeId,
                request.DegreeId,
                request.CourseId,
                request.Id);

            if (duplicate)
                throw new Exception(
                    "Coordinator mapping already exists.");

            var entity = await _repository.GetByIdAsync(request.Id);

            if (entity == null)
                return null;

            entity.LoginId = request.LoginId;
            entity.DegreeTypeId = request.DegreeTypeId;
            entity.DegreeId = request.DegreeId;
            entity.CourseId = request.CourseId;
            entity.Status = request.Status;

            entity.UpdateOn = DateTime.UtcNow;

            var updated = await _repository.UpdateAsync(entity);

            return new DocumentCoordinatorDto
            {
                Id = updated!.Id,
                LoginId = updated.LoginId,
                DegreeTypeId = updated.DegreeTypeId,
                DegreeId = updated.DegreeId,
                CourseId = updated.CourseId,
                Status = updated.Status
            };
        }

        public async Task<bool> SoftDeleteAsync(
            Guid id,
            string updatedBy)
        {
            return await _repository.SoftDeleteAsync(id, updatedBy);
        }
    }
}