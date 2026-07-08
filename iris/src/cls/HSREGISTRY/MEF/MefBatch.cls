Class HSREGISTRY.MEF.MefBatch Extends (%Persistent, %JSON.Adaptor)
{
Property FileName As %String(MAXLEN = 300) [ Required ];
Property SourceSystem As %String(MAXLEN = 100) [ InitialExpression = "NYeC" ];
Property MefVersion As %String(MAXLEN = 100) [ Required ];
Property FileHash As %String(MAXLEN = 128);
Property RawFilePath As %String(MAXLEN = 1000);
Property Status As %String(VALUELIST = ",UPLOADED,VALIDATING,IMPORTED,FAILED,ARCHIVED") [ InitialExpression = "UPLOADED" ];
Property ImportedAt As %TimeStamp;
Property TotalRows As %Integer [ InitialExpression = 0 ];
Property ValidRows As %Integer [ InitialExpression = 0 ];
Property RejectedRows As %Integer [ InitialExpression = 0 ];
Property WarningRows As %Integer [ InitialExpression = 0 ];
Property CreatedAt As %TimeStamp [ InitialExpression = {$ZDATETIME($HOROLOG,3,1,3)} ];
Property UpdatedAt As %TimeStamp;

Index VersionIdx On MefVersion [ Unique ];
Index StatusIdx On Status;
Index CreatedIdx On CreatedAt;
}
