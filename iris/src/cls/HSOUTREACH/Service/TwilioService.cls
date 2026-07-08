Class HSOUTREACH.Service.TwilioService Extends %RegisteredObject
{
ClassMethod GetConfig() As %DynamicObject
{
    Set data={}
    Do data.%Set("mode", "TEST")
    Do data.%Set("accountSid", "AC***************1234")
    Do data.%Set("messagingServiceSid", "MG***************5678")
    Do data.%Set("callbackBaseUrl", "https://outreach.customer.org")
    Do data.%Set("sendWindowStart", "09:00")
    Do data.%Set("sendWindowEnd", "17:00")
    Do data.%Set("maxRetryAttempts", 5)
    Do data.%Set("status", "Configured")
    Quit data
}

ClassMethod SaveConfig(payload As %DynamicObject) As %DynamicObject
{
    Do ##class(HSAUDIT.Audit.AuditService).WriteEvent("TWILIO_CONFIG_CHANGED", "HSOUTREACH.Admin.TwilioConfiguration", "active", payload.%ToJSON())
    Set result={}
    Do result.%Set("status", "saved")
    Do result.%Set("mode", payload.%Get("mode", "TEST"))
    Quit result
}

ClassMethod SendTest(payload As %DynamicObject) As %DynamicObject
{
    Do ##class(HSAUDIT.Audit.AuditService).WriteEvent("TWILIO_TEST_SMS_SENT", "HSOUTREACH.Admin.TwilioConfiguration", "active")
    Set result={}
    Do result.%Set("status", "queued")
    Do result.%Set("to", payload.%Get("to", ""))
    Do result.%Set("provider", "Twilio")
    Quit result
}
}
