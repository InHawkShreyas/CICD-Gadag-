using System.Security.Cryptography;
using System.Text;

namespace UniversitySystem.Domain.Utils
{
    public static class EasebuzzHashHelper
    {
        public static string GenerateHash512(string input)
        {
            using var sha512 = SHA512.Create();
            var bytes = Encoding.UTF8.GetBytes(input);
            var hash = sha512.ComputeHash(bytes);
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }
    }
}