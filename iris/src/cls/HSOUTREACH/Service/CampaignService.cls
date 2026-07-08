Class HSOUTREACH.Service.CampaignService Extends %RegisteredObject
{
ClassMethod List() As %DynamicArray
{
    // Starter returns mock data. Replace with SQL/persistent queries.
    Quit ##class(HSOUTREACH.Service.MockDataService).Campaigns()
}

ClassMethod Create(payload As %DynamicObject) As %DynamicObject
{
    Set campaign = ##class(HSOUTREACH.Campaign.OutreachCampaign).%New()
    Set campaign.Name = payload.%Get("name", "Untitled Campaign")
    Set campaign.CustomerName = payload.%Get("customerName", "")
    Set campaign.FacilityCode = payload.%Get("facilityCode", "")
    Set campaign.FacilityName = payload.%Get("facilityName", "")
    Set campaign.NpiLocation = payload.%Get("npiLocation", "")
    Set campaign.DailyLimit = payload.%Get("dailyLimit", 50)
    Set campaign.ExternalSurveyBaseUrl = payload.%Get("externalSurveyBaseUrl", "")
    Set campaign.Status = "DRAFT"
    Set sc = campaign.%Save()
    If $$$ISERR(sc) Quit {"error":"Unable to save campaign"}
    Do ##class(HSAUDIT.Audit.AuditService).WriteEvent("CAMPAIGN_CREATED", "HSOUTREACH.Campaign.OutreachCampaign", campaign.%Id())
    Set result = {}
    Do result.%Set("id", campaign.%Id())
    Do result.%Set("status", campaign.Status)
    Do result.%Set("name", campaign.Name)
    Quit result
}

ClassMethod Launch(id As %String) As %DynamicObject
{
    Do ##class(HSAUDIT.Audit.AuditService).WriteEvent("CAMPAIGN_LAUNCHED", "HSOUTREACH.Campaign.OutreachCampaign", id)
    Set result={}
    Do result.%Set("id", id)
    Do result.%Set("status", "SCHEDULED")
    Quit result
}

ClassMethod Pause(id As %String) As %DynamicObject
{
    Do ##class(HSAUDIT.Audit.AuditService).WriteEvent("CAMPAIGN_PAUSED", "HSOUTREACH.Campaign.OutreachCampaign", id)
    Set result={}
    Do result.%Set("id", id)
    Do result.%Set("status", "PAUSED")
    Quit result
}
}
