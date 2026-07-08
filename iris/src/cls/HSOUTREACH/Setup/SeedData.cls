Class HSOUTREACH.Setup.SeedData Extends %RegisteredObject
{
ClassMethod Run() As %Status
{
    Set sc=$$$OK
    Set template=##class(HSOUTREACH.SMS.SmsTemplate).%New()
    Set template.Name="Generic External Survey Invite"
    Set template.Version="1.0"
    Set template.Body="Hello {{FirstName}}, your healthcare provider has requested that you complete a secure questionnaire. Please visit {{SurveyLink}}. Reply STOP to opt out."
    Set sc=template.%Save() Quit:$$$ISERR(sc) sc

    Set config=##class(HSOUTREACH.Admin.TwilioConfiguration).%New()
    Set config.Name="Default Twilio Test Configuration"
    Set config.Mode="TEST"
    Set config.AccountSid="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    Set config.MessagingServiceSid="MGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    Set config.AuthTokenSecretRef="vault://twilio/default/auth-token"
    Set config.CallbackBaseUrl="https://outreach.customer.org"
    Set sc=config.%Save() Quit:$$$ISERR(sc) sc

    Do ##class(HSAUDIT.Audit.AuditService).WriteEvent("SEED_DATA_LOADED", "HSOUTREACH.Setup.SeedData", "Run")
    Quit $$$OK
}
}
