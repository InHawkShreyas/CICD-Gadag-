using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using UniversitySystem.Domain.Utils;

namespace UniversitySystem.Api.Controllers.Payment
{
    [ApiController]
    [Route("api/[controller]")]
    public class EasebuzzController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EasebuzzController> _logger;

        public EasebuzzController(IConfiguration config, ILogger<EasebuzzController> logger)
        {
            _config = config;
            _logger = logger;
        }

        // --------------------------------------------------
        // CREATE PAYMENT LINK
        // --------------------------------------------------
        [HttpPost("create-payment-link")]
        public async Task<IActionResult> CreatePaymentLink([FromBody] EasebuzzInitRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Invalid request.");

                string key = _config["Easebuzz:Key"];
                string salt = _config["Easebuzz:Salt"];
                string subMerchantId = _config["Easebuzz:SubMerchantId"];

                if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(salt))
                    return BadRequest("Easebuzz credentials missing.");

                if (string.IsNullOrWhiteSpace(request.FeeType))
                    return BadRequest("FeeType is required.");

                string feeType = request.FeeType.Trim();

                // Dynamic account mapping
                string collegeAccount = _config[$"Easebuzz:AccountCodes:{feeType}"];
                string inhawkAccount = _config["Easebuzz:AccountCodes:INHAWKMGRDPU"];

                if (string.IsNullOrWhiteSpace(collegeAccount) || string.IsNullOrWhiteSpace(inhawkAccount))
                    return BadRequest($"Invalid account mapping for feeType: {feeType}");

                // Generate txn id
                string txnid = $"{request.ReceiptNo}_{DateTime.UtcNow.Ticks}";

                decimal collegeAmount = request.CollegePayable;
                decimal serviceAmount = request.ServiceCharge;
                decimal totalAmount = collegeAmount + serviceAmount;

                if (totalAmount <= 0)
                    return BadRequest("Invalid amount.");

                // Split JSON (IMPORTANT: must match Easebuzz format)
                string splitJson =
                    $"{{\"{collegeAccount}\":{collegeAmount.ToString("F2", CultureInfo.InvariantCulture)}," +
                    $"\"{inhawkAccount}\":{serviceAmount.ToString("F2", CultureInfo.InvariantCulture)}}}";

                // UDFs
                string udf1 = request.ReceiptNo;
                string udf2 = request.ApplicationId ?? "";
                string udf3 = request.Phone ?? "";
                string udf4 = totalAmount.ToString("F2", CultureInfo.InvariantCulture);

                string[] udfs = { udf1, udf2, udf3, udf4, "", "", "", "", "", "" };

                // Hash sequence
                string hashSequence = string.Join("|",
                    new[]
                    {
                        key,
                        txnid,
                        totalAmount.ToString("F2", CultureInfo.InvariantCulture),
                        feeType,
                        request.Name?.Trim(),
                        request.Email?.Trim()
                    }
                    .Concat(udfs)
                    .Append(salt)
                );

                string hash = EasebuzzHashHelper.GenerateHash512(hashSequence);

                var form = new Dictionary<string, string>
                {
                    { "key", key },
                    { "txnid", txnid },
                    { "amount", totalAmount.ToString("F2", CultureInfo.InvariantCulture) },
                    { "productinfo", feeType },
                    { "firstname", request.Name ?? "" },
                    { "email", request.Email ?? "" },
                    { "phone", request.Phone ?? "" },
                    { "surl", _config["Easebuzz:SuccessUrl"] },
                    { "furl", _config["Easebuzz:FailureUrl"] },
                    { "hash", hash },

                    { "udf1", udf1 }, { "udf2", udf2 }, { "udf3", udf3 }, { "udf4", udf4 },
                    { "udf5", "" }, { "udf6", "" }, { "udf7", "" }, { "udf8", "" }, { "udf9", "" }, { "udf10", "" },

                    { "show_payment_mode", "NB,DC,CC,UPI" },
                    { "split_payments", splitJson },
                    { "sub_merchant_id", subMerchantId }
                };

                _logger.LogInformation("Easebuzz Request: {@form}", form);

                using var client = new HttpClient();
                var response = await client.PostAsync(
                    "https://pay.easebuzz.in/payment/initiateLink",
                    new FormUrlEncodedContent(form)
                );

                var responseString = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("Easebuzz Response: {res}", responseString);

                var json = JObject.Parse(responseString);

                if (json["data"] != null && json["data"].Type == JTokenType.String)
                {
                    return Ok(new
                    {
                        paymentUrl = $"https://pay.easebuzz.in/pay/{json["data"]}"
                    });
                }

                return StatusCode(500, json["error_desc"]?.ToString() ?? "Easebuzz error");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Easebuzz init failed");
                return StatusCode(500, "Payment initiation failed");
            }
        }

        // --------------------------------------------------
        // REDIRECT (SUCCESS / FAILURE HANDLER)
        // --------------------------------------------------
        [HttpPost("redirect")]
        public IActionResult HandleRedirect([FromForm] Dictionary<string, string> form)
        {
            try
            {
                _logger.LogInformation("Easebuzz Redirect: {@form}", form);

                var status = form.ContainsKey("status") ? form["status"] : "unknown";
                var txnid = form.ContainsKey("txnid") ? form["txnid"] : "";

                if (status == "success")
                {
                    return Redirect($"http://localhost:5173/login?payment=success&txnid={txnid}");
                }
                else
                {
                    return Redirect($"http://localhost:5173/login?payment=failed&txnid={txnid}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Redirect handling failed");
                return Redirect("http://localhost:5173/login?payment=error");
            }
        }

        // --------------------------------------------------
        // WEBHOOK (OPTIONAL)
        // --------------------------------------------------
        [HttpPost("webhook")]
        public async Task<IActionResult> Webhook()
        {
            using var reader = new StreamReader(Request.Body);
            string raw = await reader.ReadToEndAsync();

            _logger.LogInformation("Easebuzz Webhook: {Raw}", raw);
            return Ok();
        }
    }
}