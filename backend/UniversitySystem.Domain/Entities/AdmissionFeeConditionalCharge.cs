using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Domain.Entities
{
    [Table("admission_fee_conditional_charge", Schema = "fees")]
    public class AdmissionFeeConditionalCharge : AuditBase
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("condition_id")]
        public Guid ConditionId { get; set; }

        [ForeignKey("ConditionId")]
        public Lookup? Condition { get; set; }

        [Column("particular_name")]
        [MaxLength(200)]
        public string ParticularName { get; set; } = default!;

        [Column("amount")]
        public decimal Amount { get; set; }

        [Column("description")]
        public string? Description { get; set; }
    }
}
