using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Web;

namespace UniversitySystem.Api.Controllers.Payment
{
    [ApiController]
    [Route("api/payment/redirect")] // ✅ matches SuccessUrl
    public class RedirectController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly ILogger<RedirectController> _logger;

        public RedirectController(IConfiguration config, ILogger<RedirectController> logger)
        {
            _config = config;
            _logger = logger;
        }

        // Handles BOTH GET and POST from Easebuzz
        [HttpGet, HttpPost]
        public async Task<IActionResult> HandleEasebuzzRedirect()
        {
            try
            {
                var bag = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

                // ✅ Read query params
                foreach (var q in Request.Query)
                    bag[q.Key] = q.Value;

                // ✅ Read form params (Easebuzz sends POST form)
                if (Request.HasFormContentType)
                {
                    var form = await Request.ReadFormAsync();
                    foreach (var f in form)
                        bag[f.Key] = f.Value;
                }

                _logger.LogInformation("Easebuzz Redirect Payload: {@bag}", bag);

                // Extract fields
                string status        = Get(bag, "status");
                string receiptNo     = Get(bag, "udf1");
                string orderId       = Get(bag, "txnid");
                string easepayid     = Get(bag, "easepayid", Get(bag, "mihpayid"));
                string paymentMode   = Get(bag, "mode", Get(bag, "card_type"));
                string amount        = Get(bag, "amount");
                string feeType       = Get(bag, "productinfo", "MGRDPU").ToUpperInvariant();
                string applicationId = Get(bag, "udf2");

                if (string.IsNullOrWhiteSpace(receiptNo))
                {
                    _logger.LogWarning("Missing receipt number in Easebuzz redirect");
                    return BadRequest("Invalid redirect payload.");
                }

                string frontendBase = _config["Frontend:BaseUrl"];
                if (string.IsNullOrWhiteSpace(frontendBase))
                {
                    _logger.LogError("Frontend BaseUrl missing in config");
                    return StatusCode(500, "Frontend base URL not configured.");
                }

                // ✅ Frontend route
                string frontendPath = "/student/fee-response";

                // ✅ Build query string (MATCH frontend expectations)
                var qstring = HttpUtility.ParseQueryString(string.Empty);
                qstring["status"] = status;
                qstring["receipt"] = receiptNo; // 🔥 FIXED
                qstring["order_id"] = orderId;
                qstring["easepayid"] = easepayid;
                qstring["mode"] = paymentMode;
                qstring["amount"] = amount;
                qstring["productinfo"] = feeType;
                qstring["application_id"] = applicationId;

                string redirectUrl = $"{frontendBase}{frontendPath}?{qstring}";

                _logger.LogInformation("Redirecting to frontend: {url}", redirectUrl);

                return Redirect(redirectUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Easebuzz redirect handling failed");

                string fallback = $"{_config["Frontend:BaseUrl"]}/student/fee-response?status=error";
                return Redirect(fallback);
            }
        }

        private static string Get(IDictionary<string, string> bag, string key, string fallback = "")
            => bag.TryGetValue(key, out var v) && !string.IsNullOrWhiteSpace(v) ? v : fallback;
    }
}