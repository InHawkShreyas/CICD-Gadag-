using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Application.Dtos
{
    public class ApplicationFeeResponseDto
    {
        public Guid Id { get; set; }
        public Guid DegreeTypeId { get; set; }
        public string? DegreeTypeName { get; set; }
        public Guid? DegreeId { get; set; }
        public string? DegreeName { get; set; }
        public Guid? CourseId { get; set; }
        public Guid? BatchTypeId { get; set; }
        public string? BatchTypeName { get; set; }
        public string? CourseName { get; set; }
        public Guid? AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public Guid? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public decimal Amount { get; set; }
        public decimal PlatformCharges { get; set; }
        public decimal TotalAmount { get; set; }
        public bool IsActive { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}