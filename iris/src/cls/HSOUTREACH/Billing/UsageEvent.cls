Class HSOUTREACH.Billing.UsageEvent Extends (%Persistent, %JSON.Adaptor)
{
Property CustomerAccountId As %String(MAXLEN = 100);
Property CampaignId As %Integer;
Property BatchId As %Integer;
Property EventType As %String(MAXLEN = 100) [ Required ];
Property Quantity As %Decimal(18,4) [ InitialExpression = 1 ];
Property UnitCost As %Decimal(18,6) [ InitialExpression = 0 ];
Property ChargeAmount As %Decimal(18,6) [ InitialExpression = 0 ];
Property VendorCostAmount As %Decimal(18,6) [ InitialExpression = 0 ];
Property Currency As %String(MAXLEN = 3) [ InitialExpression = "USD" ];
Property SourceObjectClass As %String(MAXLEN = 200);
Property SourceObjectId As %String(MAXLEN = 100);
Property EventDate As %Date [ InitialExpression = {$HOROLOG} ];
Property CreatedAt As %TimeStamp [ InitialExpression = {$ZDATETIME($HOROLOG,3,1,3)} ];

Index CustomerDateIdx On (CustomerAccountId, EventDate);
Index CampaignIdx On CampaignId;
Index EventTypeIdx On EventType;
}
