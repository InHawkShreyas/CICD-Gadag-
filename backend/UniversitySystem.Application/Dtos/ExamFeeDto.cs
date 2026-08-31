using System;

namespace UniversitySystem.Application.Dtos
{
    public class ExamFeeUpsertDto
    {
        public Guid? Id { get; set; }

        public Guid? DegreeId { get; set; }

        public Guid? CourseId { get; set; }

        public Guid? AcademicYearId { get; set; }

        public decimal? ExamFeeAmount { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public DateTime? FineEndDate { get; set; }

        public decimal? FineAmount { get; set; }

        public decimal? PlatformCharges { get; set; }

        public decimal? TotalAmount { get; set; }

        public bool? Status { get; set; }
    }

    public class ExamFeeResponseDto
    {
        public Guid Id { get; set; }

        public Guid? DegreeId { get; set; }

        public Guid? CourseId { get; set; }

        public Guid? AcademicYearId { get; set; }

        public decimal? ExamFeeAmount { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public DateTime? FineEndDate { get; set; }

        public decimal? FineAmount { get; set; }

        public decimal? PlatformCharges { get; set; }

        public decimal? TotalAmount { get; set; }

        public string? InsertBy { get; set; }

        public DateTime? InsertOn { get; set; }

        public string? UpdateBy { get; set; }

        public DateTime? UpdateOn { get; set; }

        public bool? Status { get; set; }

        public static ExamFeeResponseDto FromEntity(ExamFee entity)
        {
            return new ExamFeeResponseDto
            {
                Id = entity.Id,
                DegreeId = entity.DegreeId,
                CourseId = entity.CourseId,
                AcademicYearId = entity.AcademicYearId,

                ExamFeeAmount = entity.ExamFeeAmount,

                StartDate = entity.StartDate,
                EndDate = entity.EndDate,
                FineEndDate = entity.FineEndDate,

                FineAmount = entity.FineAmount,
                PlatformCharges = entity.PlatformCharges,
                TotalAmount = entity.TotalAmount,

                Status = entity.Status,

                InsertBy = entity.InsertBy,
                InsertOn = entity.InsertOn,
                UpdateBy = entity.UpdateBy,
                UpdateOn = entity.UpdateOn
            };
        }
    }
}