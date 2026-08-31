using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace UniversitySystem.Application.Dtos
{
    public class ApplicationFeeUpsertDto
    {
        public Guid? Id { get; set; }
        public Guid DegreeTypeId { get; set; }
        public Guid? DegreeId { get; set; }
        public Guid? CourseId { get; set; }
        public Guid? BatchTypeId { get; set; }
        public Guid? AcademicYearId { get; set; }
        public Guid? CategoryId { get; set; }
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public decimal Amount { get; set; }
        public decimal PlatformCharges { get; set; } = 90;
        public decimal? TotalAmount { get; set; }
        public bool Status { get; set; } = true;
    }
    public class ApplicationFeeBulkUpsertDto
    {
        public List<Guid> DegreeTypeIds { get; set; } = new();
        public List<Guid> DegreeIds { get; set; } = new();
        public List<Guid> CourseIds { get; set; } = new();
        public List<Guid> BatchTypeIds { get; set; } = new();
        public List<Guid> AcademicYearIds { get; set; } = new();
        public List<Guid> CategoryIds { get; set; } = new();
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public decimal Amount { get; set; }
        public decimal PlatformCharges { get; set; } = 90;
        public decimal? TotalAmount { get; set; }
    }
}