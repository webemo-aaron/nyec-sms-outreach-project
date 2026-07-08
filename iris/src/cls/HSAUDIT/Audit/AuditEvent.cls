Class HSAUDIT.Audit.AuditEvent Extends (%Persistent, %JSON.Adaptor)
{
Property EventType As %String(MAXLEN = 100) [ Required ];
Property NamespaceName As %String(MAXLEN = 100);
Property UserId As %String(MAXLEN = 200);
Property CustomerAccountId As %String(MAXLEN = 100);
Property CampaignId As %String(MAXLEN = 100);
Property ObjectClass As %String(MAXLEN = 200);
Property ObjectId As %String(MAXLEN = 100);
Property BeforeJson As %String(MAXLEN = 20000);
Property AfterJson As %String(MAXLEN = 20000);
Property IpAddress As %String(MAXLEN = 100);
Property CorrelationId As %String(MAXLEN = 100);
Property CreatedAt As %TimeStamp [ InitialExpression = {$ZDATETIME($HOROLOG,3,1,3)} ];

Index EventTypeIdx On EventType;
Index CampaignIdx On CampaignId;
Index CreatedAtIdx On CreatedAt;
}
