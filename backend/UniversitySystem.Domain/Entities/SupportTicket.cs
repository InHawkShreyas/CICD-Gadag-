using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniversitySystem.Domain.Entities
{
    [Table("support_tickets", Schema = "support")]
    public class SupportTicket : AuditBase
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("ticket_no")]
        [MaxLength(20)]
        public string TicketNo { get; set; } = string.Empty;

        [Column("username")]
        [MaxLength(100)]
        public string Username { get; set; } = string.Empty;

        [Column("issue_id")]
        public Guid IssueId { get; set; }

        [Column("status_id")]
        public Guid StatusId { get; set; }

        [Column("solved_by")]
        [MaxLength(100)]
        public string? SolvedBy { get; set; }

        [ForeignKey(nameof(IssueId))]
        public virtual Lookup? Issue { get; set; }

        [ForeignKey(nameof(StatusId))]
        public virtual Lookup? StatusLookup { get; set; }

        public virtual ICollection<SupportTicketMessage> Messages { get; set; } = new List<SupportTicketMessage>();
    }
}