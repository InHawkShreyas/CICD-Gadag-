using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Domain.Entities
{
    [Table("pg_education_details", Schema = "admission")]
    public class PgEducationDetail : AuditBase
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("application_id")]
        public Guid ApplicationId { get; set; }

        [MaxLength(50)]
        [Column("app_no")]
        public string? AppNo { get; set; }

        [Required]
        [MaxLength(30)]
        [Column("exam_level")]
        public string ExamLevel { get; set; } = string.Empty;

        [MaxLength(150)]
        [Column("institute_name")]
        public string? InstituteName { get; set; }

        [MaxLength(50)]
        [Column("registration_number")]
        public string? RegistrationNumber { get; set; }

        [Column("year")]
        public int? Year { get; set; }

        [Column("max_marks", TypeName = "numeric(8,2)")]
        public decimal? MaxMarks { get; set; }

        [Column("obtained_marks", TypeName = "numeric(8,2)")]
        public decimal? ObtainedMarks { get; set; }

        [Column("percentage", TypeName = "numeric(5,2)")]
        public decimal? Percentage { get; set; }

        [Column("cgpa", TypeName = "numeric(5,2)")]
        public decimal? Cgpa { get; set; }

        [Column("same_institution")]
        public bool? SameInstitution { get; set; }

        [MaxLength(10)]
        [Column("entry_mode")]
        public string? EntryMode { get; set; }

        [MaxLength(100)]
        [Column("ug_subject")]
        public string? UgSubject { get; set; }

        [Column("overall_percentage", TypeName = "numeric(5,2)")]
        public decimal? OverallPercentage { get; set; }

        [Column("status")]
        public bool? Status { get; set; } = true;

        [ForeignKey(nameof(ApplicationId))]
        public Applications Application { get; set; } = null!;

        public ICollection<PgEducationPeriod> Periods { get; set; } = new List<PgEducationPeriod>();
    }
}
