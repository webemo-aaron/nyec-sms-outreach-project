Class HSOUTREACH.SMS.SmsTemplate Extends (%Persistent, %JSON.Adaptor)
{
Property Name As %String(MAXLEN = 200) [ Required ];
Property Version As %String(MAXLEN = 50) [ InitialExpression = "1.0" ];
Property Body As %String(MAXLEN = 1600) [ Required ];
Property CustomerAccountId As %String(MAXLEN = 100);
Property ActiveFlag As %Boolean [ InitialExpression = 1 ];
Property CreatedBy As %String(MAXLEN = 200);
Property CreatedAt As %TimeStamp [ InitialExpression = {$ZDATETIME($HOROLOG,3,1,3)} ];
Property UpdatedAt As %TimeStamp;

Index NameVersionIdx On (Name, Version);
Index ActiveIdx On ActiveFlag;
}
