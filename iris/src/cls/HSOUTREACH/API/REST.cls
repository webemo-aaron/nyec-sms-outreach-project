Class HSOUTREACH.API.REST Extends %CSP.REST
{
Parameter CONTENTTYPE = "application/json";

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
  <Route Url="/dashboard" Method="GET" Call="Dashboard"/>
  <Route Url="/mef/batches" Method="GET" Call="MefBatches"/>
  <Route Url="/mef/batches" Method="POST" Call="MefImport"/>
  <Route Url="/campaigns" Method="GET" Call="Campaigns"/>
  <Route Url="/campaigns" Method="POST" Call="CreateCampaign"/>
  <Route Url="/campaigns/:id/launch" Method="POST" Call="LaunchCampaign"/>
  <Route Url="/campaigns/:id/pause" Method="POST" Call="PauseCampaign"/>
  <Route Url="/dispatches" Method="GET" Call="Dispatches"/>
  <Route Url="/twilio/config" Method="GET" Call="TwilioConfig"/>
  <Route Url="/twilio/config" Method="PUT" Call="SaveTwilioConfig"/>
  <Route Url="/twilio/test" Method="POST" Call="TwilioTest"/>
  <Route Url="/billing/summary" Method="GET" Call="BillingSummary"/>
  <Route Url="/audit/events" Method="GET" Call="AuditEvents"/>
  <Route Url="/sms/status" Method="POST" Call="SmsStatusCallback"/>
  <Route Url="/sms/inbound" Method="POST" Call="SmsInboundCallback"/>
</Routes>
}

ClassMethod Dashboard() As %Status
{
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok(##class(HSOUTREACH.Service.MockDataService).Dashboard())
}

ClassMethod MefBatches() As %Status
{
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok(##class(HSOUTREACH.Service.MefImportService).ListBatches())
}

ClassMethod MefImport() As %Status
{
    Set payload = ..ReadJson()
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok(##class(HSOUTREACH.Service.MefImportService).RegisterImport(payload))
}

ClassMethod Campaigns() As %Status
{
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok(##class(HSOUTREACH.Service.CampaignService).List())
}

ClassMethod CreateCampaign() As %Status
{
    Set payload = ..ReadJson()
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok(##class(HSOUTREACH.Service.CampaignService).Create(payload))
}

ClassMethod LaunchCampaign(id As %String) As %Status
{
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok(##class(HSOUTREACH.Service.CampaignService).Launch(id))
}

ClassMethod PauseCampaign(id As %String) As %Status
{
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok(##class(HSOUTREACH.Service.CampaignService).Pause(id))
}

ClassMethod Dispatches() As %Status
{
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok(##class(HSOUTREACH.Service.MockDataService).Dispatches())
}

ClassMethod TwilioConfig() As %Status
{
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok(##class(HSOUTREACH.Service.TwilioService).GetConfig())
}

ClassMethod SaveTwilioConfig() As %Status
{
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok(##class(HSOUTREACH.Service.TwilioService).SaveConfig(..ReadJson()))
}

ClassMethod TwilioTest() As %Status
{
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok(##class(HSOUTREACH.Service.TwilioService).SendTest(..ReadJson()))
}

ClassMethod BillingSummary() As %Status
{
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok(##class(HSOUTREACH.Service.MockDataService).BillingSummary())
}

ClassMethod AuditEvents() As %Status
{
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok(##class(HSAUDIT.Audit.AuditService).Recent(25))
}

ClassMethod SmsStatusCallback() As %Status
{
    Set payload = ..ReadJson()
    Do ##class(HSAUDIT.Audit.AuditService).WriteEvent("TWILIO_STATUS_CALLBACK", "HSOUTREACH.SMS.OutboundMessage", payload.%ToJSON())
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok({"accepted":1})
}

ClassMethod SmsInboundCallback() As %Status
{
    Set payload = ..ReadJson()
    Do ##class(HSAUDIT.Audit.AuditService).WriteEvent("TWILIO_INBOUND_CALLBACK", "HSOUTREACH.SMS.OptOut", payload.%ToJSON())
    Quit ##class(HSFRAMEWORK.Core.ApiResponse).Ok({"accepted":1})
}

ClassMethod ReadJson() As %DynamicObject
{
    Set body = %request.Content.Read($$$MaxLocalLength)
    If body="" Quit {}
    Quit {}.%FromJSON(body)
}
}
