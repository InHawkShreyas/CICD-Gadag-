using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Application.Dtos.Application
{
    public class PgEducationPeriodDto
    {
        public Guid Id { get; set; }
        public string PeriodType { get; set; } = string.Empty;
        public int PeriodIndex { get; set; }
        public string? InstituteName { get; set; }
        public string? RegistrationNumber { get; set; }
        public decimal? Sgpa { get; set; }
        public decimal? Percentage { get; set; }
        public decimal? Cgpa { get; set; }
        public decimal? MaxMarks { get; set; }
        public decimal? ObtainedMarks { get; set; }
    }

    public class PgEducationPeriodRequest
    {
        public string PeriodType { get; set; } = string.Empty;
        public int PeriodIndex { get; set; }
        public string? InstituteName { get; set; }
        public string? RegistrationNumber { get; set; }
        public decimal? Sgpa { get; set; }
        public decimal? Percentage { get; set; }
        public decimal? Cgpa { get; set; }
        public decimal? MaxMarks { get; set; }
        public decimal? ObtainedMarks { get; set; }
    }
}
