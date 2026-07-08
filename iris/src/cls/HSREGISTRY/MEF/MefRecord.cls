Class HSREGISTRY.MEF.MefRecord Extends (%Persistent, %JSON.Adaptor)
{
Property Batch As HSREGISTRY.MEF.MefBatch [ Required ];
Property SourceRowNumber As %Integer;
Property MemberId As %String(MAXLEN = 100);
Property MedicaidId As %String(MAXLEN = 100);
Property FirstName As %String(MAXLEN = 100);
Property LastName As %String(MAXLEN = 100);
Property DOB As %Date;
Property PhoneMobile As %String(MAXLEN = 50);
Property PhoneNormalized As %String(MAXLEN = 20);
Property PhoneHash As %String(MAXLEN = 128);
Property FacilityCode As %String(MAXLEN = 100);
Property NpiLocation As %String(MAXLEN = 20);
Property EligibilityStatus As %String(MAXLEN = 50);
Property ActiveFlag As %Boolean [ InitialExpression = 1 ];
Property ValidationStatus As %String(VALUELIST = ",VALID,WARNING,REJECTED") [ InitialExpression = "VALID" ];
Property SuppressionReason As %String(MAXLEN = 300);
Property CreatedAt As %TimeStamp [ InitialExpression = {$ZDATETIME($HOROLOG,3,1,3)} ];

Index BatchIdx On Batch;
Index PhoneIdx On PhoneHash;
Index MedicaidIdx On MedicaidId;
Index CampaignSelectIdx On (Batch, ActiveFlag, ValidationStatus, FacilityCode, NpiLocation);
}
