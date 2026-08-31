using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace UniversitySystem.Application.Dtos
{
    public class SupportTicketMessageDto
    {
        public Guid Id { get; set; }
        public Guid TicketId { get; set; }
        public string SenderType { get; set; } = string.Empty;
        public string? SenderName { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime InsertOn { get; set; }
        public DateTime? UpdateOn { get; set; }
        public string? UpdatedBy { get; set; }
    }
    public class CreateSupportTicketMessageDto
    {
        [Required]
        public Guid TicketId { get; set; }
        [Required]
        [RegularExpression("^(student|admin)$")]
        public string SenderType { get; set; } = string.Empty;
        public string? SenderName { get; set; }
        [Required]
        public string Message { get; set; } = string.Empty;
        public string? InsertBy { get; set; }
    }
    public class UpdateSupportTicketMessageDto
    {
        [Required]
        public string Message { get; set; } = string.Empty;
        public string? UpdatedBy { get; set; }
    }
}