using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniversitySystem.Domain.Entities
{
    [Table("document_coordinator_mapping", Schema = "auth")]
    public class DocumentCoordinatorMapping : AuditBase
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("login_id")]
        public Guid LoginId { get; set; }

        [Required]
        [Column("degree_type_id")]
        public Guid? DegreeTypeId { get; set; }

        [Required]
        [Column("degree_id")]
        public Guid DegreeId { get; set; }

        [Required]
        [Column("course_id")]
        public Guid CourseId { get; set; }

        [ForeignKey(nameof(LoginId))]
        public virtual Login? Login { get; set; }

        [ForeignKey(nameof(DegreeId))]
        public virtual Degree? Degree { get; set; }

        [ForeignKey(nameof(CourseId))]
        public virtual Course? Course { get; set; }

        [ForeignKey(nameof(DegreeTypeId))]
        public virtual Lookup? DegreeType { get; set; }
    }
}