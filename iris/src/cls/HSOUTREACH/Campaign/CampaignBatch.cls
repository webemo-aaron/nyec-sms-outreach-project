Class HSOUTREACH.Campaign.CampaignBatch Extends (%Persistent, %JSON.Adaptor)
{
Property CampaignId As %Integer [ Required ];
Property BatchDate As %Date [ Required ];
Property DailyLimit As %Integer;
Property Status As %String(VALUELIST = ",PENDING,SELECTED,QUEUED,SENDING,COMPLETE,FAILED") [ InitialExpression = "PENDING" ];
Property SelectedCount As %Integer [ InitialExpression = 0 ];
Property QueuedCount As %Integer [ InitialExpression = 0 ];
Property SentCount As %Integer [ InitialExpression = 0 ];
Property DeliveredCount As %Integer [ InitialExpression = 0 ];
Property FailedCount As %Integer [ InitialExpression = 0 ];
Property CreatedAt As %TimeStamp [ InitialExpression = {$ZDATETIME($HOROLOG,3,1,3)} ];
Property CompletedAt As %TimeStamp;

Index CampaignDateIdx On (CampaignId, BatchDate) [ Unique ];
Index StatusIdx On Status;
}
