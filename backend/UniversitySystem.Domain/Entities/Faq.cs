using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Domain.Entities
{
    [Table("faqs", Schema = "support")]
    public class Faq : AuditBase
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("category")]
        [MaxLength(100)]
        public string Category { get; set; } = string.Empty;

        [Column("question")]
        public string Question { get; set; } = string.Empty;

        [Column("answer")]
        public string Answer { get; set; } = string.Empty;
    }
}
