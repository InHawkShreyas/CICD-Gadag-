using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniversitySystem.Domain.Entities
{
    [Table("support_ticket_messages", Schema = "support")]
    public class SupportTicketMessage : AuditBase
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("ticket_id")]
        public Guid TicketId { get; set; }

        [Column("sender_type")]
        [MaxLength(10)]
        public string SenderType { get; set; } = string.Empty;

        [Column("sender_name")]
        [MaxLength(100)]
        public string? SenderName { get; set; }

        [Column("message")]
        public string Message { get; set; } = string.Empty;

        [ForeignKey(nameof(TicketId))]
        public virtual SupportTicket? Ticket { get; set; }
    }
}