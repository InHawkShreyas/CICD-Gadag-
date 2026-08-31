using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Domain.Entities
{
    [Table("pg_education_period", Schema = "admission")]
    public class PgEducationPeriod : AuditBase
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("pg_education_detail_id")]
        public Guid PgEducationDetailId { get; set; }

        [Required]
        [MaxLength(10)]
        [Column("period_type")]
        public string PeriodType { get; set; } = string.Empty;

        [Required]
        [Column("period_index")]
        public int PeriodIndex { get; set; }

        [MaxLength(150)]
        [Column("institute_name")]
        public string? InstituteName { get; set; }

        [MaxLength(50)]
        [Column("registration_number")]
        public string? RegistrationNumber { get; set; }

        [Column("sgpa", TypeName = "numeric(5,2)")]
        public decimal? Sgpa { get; set; }

        [Column("percentage", TypeName = "numeric(5,2)")]
        public decimal? Percentage { get; set; }

        [Column("cgpa", TypeName = "numeric(5,2)")]
        public decimal? Cgpa { get; set; }
        
        [Column("max_marks")]
        public decimal? MaxMarks { get; set; }

        [Column("obtained_marks")]
        public decimal? ObtainedMarks { get; set; }

        [Column("status")]
        public bool? Status { get; set; } = true;

        [ForeignKey(nameof(PgEducationDetailId))]
        public PgEducationDetail PgEducationDetail { get; set; } = null!;
    }
}
