using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;

namespace UniversitySystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DiagnosticsController : ControllerBase
    {
        [HttpGet("check-connectivity")]
        public async Task<IActionResult> CheckConnectivity()
        {
            var results = new Dictionary<string, string>();

            async Task TestDns(string host)
            {
                try
                {
                    var addresses = await Dns.GetHostAddressesAsync(host);
                    results[$"dns:{host}"] = string.Join(",", addresses.Select(a => a.ToString()));
                }
                catch (Exception ex)
                {
                    results[$"dns:{host}"] = $"FAILED: {ex.Message}";
                }
            }

            async Task TestHttp(string url)
            {
                try
                {
                    using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
                    var response = await client.GetAsync(url);
                    results[$"http:{url}"] = $"OK: {(int)response.StatusCode}";
                }
                catch (Exception ex)
                {
                    results[$"http:{url}"] = $"FAILED: {ex.Message}";
                }
            }

            await TestDns("pay.easebuzz.in");
            await TestDns("www.smppsmshub.in");
            await TestHttp("https://pay.easebuzz.in");
            await TestHttp("http://www.smppsmshub.in");

            return Ok(results);
        }
    }
}