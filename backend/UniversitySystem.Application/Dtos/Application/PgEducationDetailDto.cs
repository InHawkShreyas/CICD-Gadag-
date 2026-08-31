using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Application.Dtos.Application
{
    public class PgEducationDetailDto
    {
        public Guid Id { get; set; }
        public Guid ApplicationId { get; set; }
        public string? AppNo { get; set; }
        public string ExamLevel { get; set; } = string.Empty;
        public string? InstituteName { get; set; }
        public string? RegistrationNumber { get; set; }
        public int? Year { get; set; }
        public decimal? MaxMarks { get; set; }
        public decimal? ObtainedMarks { get; set; }
        public decimal? Percentage { get; set; }
        public decimal? Cgpa { get; set; }
        public bool? SameInstitution { get; set; }
        public string? EntryMode { get; set; }
        public string? UgSubject { get; set; }
        public decimal? OverallPercentage { get; set; }
        public List<PgEducationPeriodDto> Periods { get; set; } = new();
    }

    public class SaveTraditionalExamRequest
    {
        public Guid ApplicationId { get; set; }
        public string? AppNo { get; set; }

        // '10th' | '12th' | 'Diploma'
        public string ExamLevel { get; set; } = string.Empty;
        public string? InstituteName { get; set; }
        public string? RegistrationNumber { get; set; }
        public int? Year { get; set; }
        public decimal? MaxMarks { get; set; }
        public decimal? ObtainedMarks { get; set; }
        public decimal? Percentage { get; set; }
        public decimal? Cgpa { get; set; }
        public string? UgSubject { get; set; }
    }

    public class SaveDegreeMarksRequest
    {
        public Guid ApplicationId { get; set; }
        public string? AppNo { get; set; }
        public bool SameInstitution { get; set; }

        public string EntryMode { get; set; } = string.Empty;

        public int? Year { get; set; }

        public string? InstituteName { get; set; }
        public string? RegistrationNumber { get; set; }

        public string? UgSubject { get; set; }
        public decimal? OverallPercentage { get; set; }

        public List<PgEducationPeriodRequest> Periods { get; set; } = new();
    }
}