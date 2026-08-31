using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Application.Dtos
{
    // IdType is either "aadhaar" or "passport" (validated in LoginService).
    public class CheckAadharMobileRequestDto
    {
        public string IdType { get; set; } = "aadhaar";
        public string IdNumber { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
    }

    public class VerifyUsernameOtpRequestDto
    {
        public string IdType { get; set; } = "aadhaar";
        public string IdNumber { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
    }

    public class ForgotUsernameResultDto
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string? Username { get; set; }
    }
}