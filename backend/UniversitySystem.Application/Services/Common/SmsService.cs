using KVFSU.Application.Interfaces.Common;
using KVFSU.Application.Common.Settings;
using Microsoft.Extensions.Options;
using System.Net.Http;
using System.Threading.Tasks;
using System;

namespace KVFSU.Application.Services.Common
{
    public class SmsService : ISmsService
    {
        private readonly HttpClient _http;
        private readonly SmsSettings _settings;

        public SmsService(HttpClient http, IOptions<SmsSettings> settings)
        {
            _http = http;
            _settings = settings.Value;
        }

        // ✅ GENERIC SMS
        public async Task<bool> SendSmsAsync(string mobile, string message)
        {
            try
            {
                if (!mobile.StartsWith("91"))
                    mobile = "91" + mobile;

                string encodedMsg = Uri.EscapeDataString(message);

                string url =
                    $"{_settings.BaseUrl}" +
                    $"?APIKEY={_settings.ApiKey}" +
                    $"&senderid={_settings.SenderId}" +
                    $"&channel={_settings.Channel}" +
                    $"&DCS=0" +
                    $"&flashsms=0" +
                    $"&number={mobile}" +
                    $"&text={encodedMsg}" +
                    $"&route={_settings.Route}" +
                    $"&DLTTemplateId={_settings.DLTTemplateId}" +
                    $"&PEID={_settings.PEID}";

                var response = await _http.GetAsync(url);
                var body = await response.Content.ReadAsStringAsync();

                Console.WriteLine("=== SMS RESPONSE ===");
                Console.WriteLine(body);

                return body.Contains("Success") || body.Contains("000");
            }
            catch (Exception ex)
            {
                Console.WriteLine("SMS ERROR: " + ex.Message);
                return false;
            }
        }

        // ✅ OTP (DLT STRICT TEMPLATE)
        public async Task<bool> SendOtpAsync(string mobile, string otp, int validMinutes)
        {
            // ⚠️ MUST MATCH DLT TEMPLATE EXACTLY
           string message = $"{otp} is OTP for {validMinutes} minutes. Do not share with anyone. Regards, MGRDPR";

            return await SendSmsAsync(mobile, message);
        }
    }
}