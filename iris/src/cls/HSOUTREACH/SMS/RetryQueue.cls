Class HSOUTREACH.SMS.RetryQueue Extends (%Persistent, %JSON.Adaptor)
{
Property OutboundMessageId As %Integer [ Required ];
Property AttemptNumber As %Integer;
Property NextAttemptAt As %TimeStamp;
Property LastFailureCode As %String(MAXLEN = 100);
Property LastFailureReason As %String(MAXLEN = 500);
Property Status As %String(VALUELIST = ",PENDING,RUNNING,COMPLETE,CANCELLED,FAILED") [ InitialExpression = "PENDING" ];
Property CreatedAt As %TimeStamp [ InitialExpression = {$ZDATETIME($HOROLOG,3,1,3)} ];

Index NextAttemptIdx On (Status, NextAttemptAt);
Index MessageIdx On OutboundMessageId;
}
