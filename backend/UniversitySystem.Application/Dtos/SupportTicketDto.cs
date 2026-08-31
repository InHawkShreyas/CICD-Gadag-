using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Application.Dtos
{
    public class SupportTicketDto
    {
        public Guid Id { get; set; }
        public string TicketNo { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public Guid IssueId { get; set; }
        public string? IssueName { get; set; }
        public Guid StatusId { get; set; }
        public string? StatusName { get; set; }
        public string? SolvedBy { get; set; }
        public DateTime InsertOn { get; set; }
        public DateTime? UpdateOn { get; set; }
    }
    public class SupportTicketDetailDto : SupportTicketDto
    {
        public List<SupportTicketMessageDto> Messages { get; set; } = new();
    }
    public class CreateSupportTicketDto
    {
        [Required, MaxLength(100)]
        public string Username { get; set; } = string.Empty;
        [Required]
        public Guid IssueId { get; set; }
        [Required]
        public string Description { get; set; } = string.Empty;
    }
    public class UpdateSupportTicketStatusDto
    {
        [Required]
        public Guid StatusId { get; set; }
        public string? SolvedBy { get; set; }
        public string? Solution { get; set; }
        public string? UpdateBy { get; set; }
    }
}