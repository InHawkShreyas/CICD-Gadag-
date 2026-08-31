using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Domain.Entities
{
    [Table("application_fee", Schema = "fees")]
    public class ApplicationFee : AuditBase
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("degree_type_id")]
        public Guid DegreeTypeId { get; set; }

        [Column("degree_id")]
        public Guid? DegreeId { get; set; }

        [Column("course_id")]
        public Guid? CourseId { get; set; }

        [Column("academic_year_id")]
        public Guid? AcademicYearId { get; set; }

        [Column("batch_type_id")]
        public Guid? BatchTypeId { get; set; }

        [Column("category_id")]
        public Guid? CategoryId { get; set; }

        [Column("start_date")]
        public DateOnly? StartDate { get; set; }

        [Column("end_date")]
        public DateOnly? EndDate { get; set; }

        [Column("amount")]
        public decimal Amount { get; set; }

        [Column("platform_charges")]
        public decimal PlatformCharges { get; set; } = 90;

        [Column("total_amount")]
        public decimal TotalAmount { get; set; }

        [ForeignKey(nameof(DegreeId))]
        public virtual Degree? Degree { get; set; }

        [ForeignKey(nameof(CourseId))]
        public virtual Course? Course { get; set; }

        [ForeignKey(nameof(AcademicYearId))]
        public virtual AcademicYear? AcademicYear { get; set; }

        [ForeignKey(nameof(DegreeTypeId))]
        public virtual Lookup? DegreeType { get; set; }

        [ForeignKey(nameof(CategoryId))]
        public virtual Lookup? Category { get; set; }
        public Lookup? BatchType { get; set; }
    }
}