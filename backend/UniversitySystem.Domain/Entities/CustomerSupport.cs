using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Domain.Entities
{
    [Table("customer_support", Schema = "audit")]
    public class CustomerSupport
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("username")]
        public string Username { get; set; } = string.Empty;

        [Column("ticket_id")]
        public string TicketId { get; set; } = string.Empty;

        [Column("issue")]
        public string? Issue { get; set; }

        [Column("description")]
        public string? Description { get; set; }

        [Column("status")]
        public string Status { get; set; } = "Open";

        [Column("solution")]
        public string? Solution { get; set; }

        [Column("solved_by")]
        public string? SolvedBy { get; set; }

        [Column("insert_by")]
        public string? InsertBy { get; set; }

        [Column("update_by")]
        public string? UpdateBy { get; set; }

        [Column("insert_on")]
        public DateTime? InsertOn { get; set; } = DateTime.UtcNow;

        [Column("update_on")]
        public DateTime? UpdateOn { get; set; }
    }
}
