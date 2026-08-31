using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Application.Dtos
{
    public class AdmissionFeeConditionalChargeDto
    {
        public Guid Id { get; set; }
        public Guid ConditionId { get; set; }
        public string? ConditionCode { get; set; }
        public string? ConditionName { get; set; }
        public string ParticularName { get; set; } = default!;
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public bool Status { get; set; }
    }

    public class AdmissionFeeConditionalChargeCreateUpdateDto
    {
        public Guid? Id { get; set; }               // null on create
        public Guid ConditionId { get; set; }
        public string ParticularName { get; set; } = default!;
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public bool Status { get; set; } = true;
    }
}
