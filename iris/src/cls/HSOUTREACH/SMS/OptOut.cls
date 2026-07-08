Class HSOUTREACH.SMS.OptOut Extends (%Persistent, %JSON.Adaptor)
{
Property PhoneHash As %String(MAXLEN = 128) [ Required ];
Property PhoneMasked As %String(MAXLEN = 50);
Property Keyword As %String(MAXLEN = 50);
Property CurrentStatus As %String(VALUELIST = ",OPTED_OUT,OPTED_IN") [ InitialExpression = "OPTED_OUT" ];
Property Source As %String(MAXLEN = 100) [ InitialExpression = "TwilioInbound" ];
Property ProviderMessageId As %String(MAXLEN = 200);
Property RawPayloadJson As %String(MAXLEN = 20000);
Property CreatedAt As %TimeStamp [ InitialExpression = {$ZDATETIME($HOROLOG,3,1,3)} ];
Property UpdatedAt As %TimeStamp;

Index PhoneIdx On PhoneHash;
Index StatusIdx On CurrentStatus;
}
