using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Application.Dtos
{
    public class FaqDto
    {
        public Guid Id { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Question { get; set; } = string.Empty;
        public string Answer { get; set; } = string.Empty;
        public bool Active { get; set; }
        public string? InsertBy { get; set; }
        public DateTime InsertOn { get; set; }
    }

    public class CreateFaqDto
    {
        [Required, MaxLength(100)]
        public string Category { get; set; } = string.Empty;

        [Required]
        public string Question { get; set; } = string.Empty;

        [Required]
        public string Answer { get; set; } = string.Empty;

        public string? InsertBy { get; set; }
    }

    public class UpdateFaqDto
    {
        [Required, MaxLength(100)]
        public string Category { get; set; } = string.Empty;

        [Required]
        public string Question { get; set; } = string.Empty;

        [Required]
        public string Answer { get; set; } = string.Empty;

        public string? UpdateBy { get; set; }
    }
}
