using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Application.Dtos
{
    public class AuditLogResponse
    {
        public int TotalCount { get; set; }

        public List<AuditLog> Items { get; set; } = new();
    }
}
