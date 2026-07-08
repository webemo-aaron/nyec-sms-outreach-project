Class HSOUTREACH.Campaign.OutreachCampaign Extends (%Persistent, %JSON.Adaptor)
{
Property Name As %String(MAXLEN = 200) [ Required ];
Property Description As %String(MAXLEN = 2000);
Property CustomerAccountId As %String(MAXLEN = 100);
Property CustomerName As %String(MAXLEN = 200);
Property FacilityCode As %String(MAXLEN = 100);
Property FacilityName As %String(MAXLEN = 200);
Property NpiLocation As %String(MAXLEN = 20);
Property MefBatchId As %Integer;
Property SmsTemplateId As %Integer;
Property ExternalSurveyBaseUrl As %String(MAXLEN = 1000);
Property DailyLimit As %Integer [ InitialExpression = 50 ];
Property StartDate As %Date;
Property EndDate As %Date;
Property StartTime As %String(MAXLEN = 10) [ InitialExpression = "09:00" ];
Property StopTime As %String(MAXLEN = 10) [ InitialExpression = "17:00" ];
Property ScheduleDays As %String(MAXLEN = 30) [ InitialExpression = "MON,TUE,WED,THU,FRI" ];
Property Status As %String(VALUELIST = ",DRAFT,APPROVED,SCHEDULED,RUNNING,PAUSED,COMPLETED,CANCELLED") [ InitialExpression = "DRAFT" ];
Property CreatedAt As %TimeStamp [ InitialExpression = {$ZDATETIME($HOROLOG,3,1,3)} ];
Property UpdatedAt As %TimeStamp;
Property CreatedBy As %String(MAXLEN = 200);

Index StatusIdx On Status;
Index CustomerIdx On CustomerAccountId;
Index FacilityNpiIdx On (FacilityCode, NpiLocation);
Index DateIdx On (StartDate, EndDate);
}
