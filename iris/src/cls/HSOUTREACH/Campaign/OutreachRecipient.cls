Class HSOUTREACH.Campaign.OutreachRecipient Extends (%Persistent, %JSON.Adaptor)
{
Property CampaignId As %Integer [ Required ];
Property BatchId As %Integer;
Property MefRecordId As %Integer;
Property PatientKey As %String(MAXLEN = 100);
Property PhoneNormalized As %String(MAXLEN = 20);
Property PhoneHash As %String(MAXLEN = 128);
Property ExternalLink As %String(MAXLEN = 1000);
Property Status As %String(VALUELIST = ",SELECTED,QUEUED,SENT,DELIVERED,FAILED,RETRY_PENDING,OPTED_OUT,SUPPRESSED") [ InitialExpression = "SELECTED" ];
Property SuppressionReason As %String(MAXLEN = 300);
Property SelectedAt As %TimeStamp [ InitialExpression = {$ZDATETIME($HOROLOG,3,1,3)} ];
Property SentAt As %TimeStamp;
Property DeliveredAt As %TimeStamp;
Property ProviderMessageId As %String(MAXLEN = 200);

Index CampaignIdx On CampaignId;
Index BatchIdx On BatchId;
Index PhoneIdx On PhoneHash;
Index StatusIdx On Status;
}
