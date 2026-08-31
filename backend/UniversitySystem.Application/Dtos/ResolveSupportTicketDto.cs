using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Application.Dtos
{
    public class ResolveSupportTicketDto
    {
        public string Solution { get; set; } = string.Empty;
        public string Status { get; set; } = "Resolved";
        public string? SolvedBy { get; set; }
    }
}
