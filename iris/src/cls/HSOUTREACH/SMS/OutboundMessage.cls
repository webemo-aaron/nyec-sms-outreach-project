Class HSOUTREACH.SMS.OutboundMessage Extends (%Persistent, %JSON.Adaptor)
{
Property CampaignId As %Integer;
Property BatchId As %Integer;
Property RecipientId As %Integer;
Property ToPhone As %String(MAXLEN = 20);
Property ToPhoneHash As %String(MAXLEN = 128);
Property MessageBody As %String(MAXLEN = 1600);
Property Status As %String(VALUELIST = ",QUEUED,SENDING,SENT,DELIVERED,FAILED,RETRY_PENDING,PERMANENT_FAILURE,OPTED_OUT") [ InitialExpression = "QUEUED" ];
Property ProviderName As %String(MAXLEN = 50) [ InitialExpression = "Twilio" ];
Property ProviderMessageId As %String(MAXLEN = 200);
Property AttemptCount As %Integer [ InitialExpression = 0 ];
Property LastFailureCode As %String(MAXLEN = 100);
Property LastFailureReason As %String(MAXLEN = 500);
Property QueuedAt As %TimeStamp [ InitialExpression = {$ZDATETIME($HOROLOG,3,1,3)} ];
Property SentAt As %TimeStamp;
Property DeliveredAt As %TimeStamp;
Property UpdatedAt As %TimeStamp;

Index StatusIdx On Status;
Index ProviderMessageIdx On ProviderMessageId;
Index CampaignBatchIdx On (CampaignId, BatchId);
}
