Class HSOUTREACH.Admin.TwilioConfiguration Extends (%Persistent, %JSON.Adaptor)
{
Property Name As %String(MAXLEN = 100) [ Required ];
Property Mode As %String(VALUELIST = ",TEST,LIVE") [ InitialExpression = "TEST" ];
Property AccountSid As %String(MAXLEN = 200);
Property MessagingServiceSid As %String(MAXLEN = 200);
Property AuthTokenSecretRef As %String(MAXLEN = 300);
Property DefaultFromNumber As %String(MAXLEN = 50);
Property CallbackBaseUrl As %String(MAXLEN = 500);
Property StatusCallbackPath As %String(MAXLEN = 300) [ InitialExpression = "/api/nyec/sms/status" ];
Property InboundCallbackPath As %String(MAXLEN = 300) [ InitialExpression = "/api/nyec/sms/inbound" ];
Property MaxRetryAttempts As %Integer [ InitialExpression = 5 ];
Property RetryScheduleJson As %String(MAXLEN = 1000) [ InitialExpression = "[\"5m\",\"30m\",\"2h\",\"nextBusinessDay\"]" ];
Property SendWindowStart As %String(MAXLEN = 10) [ InitialExpression = "09:00" ];
Property SendWindowEnd As %String(MAXLEN = 10) [ InitialExpression = "17:00" ];
Property ActiveFlag As %Boolean [ InitialExpression = 1 ];
Property CreatedAt As %TimeStamp [ InitialExpression = {$ZDATETIME($HOROLOG,3,1,3)} ];
Property UpdatedAt As %TimeStamp;

Index ActiveIdx On ActiveFlag;
}
