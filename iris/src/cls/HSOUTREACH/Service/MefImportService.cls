Class HSOUTREACH.Service.MefImportService Extends %RegisteredObject
{
ClassMethod ListBatches() As %DynamicArray
{
    Quit ##class(HSOUTREACH.Service.MockDataService).MefBatches()
}

ClassMethod RegisterImport(payload As %DynamicObject) As %DynamicObject
{
    Set batch = ##class(HSREGISTRY.MEF.MefBatch).%New()
    Set batch.FileName = payload.%Get("fileName", "manual-import.csv")
    Set batch.MefVersion = payload.%Get("mefVersion", $ZDATE($HOROLOG,3))
    Set batch.Status = "IMPORTED"
    Set batch.TotalRows = payload.%Get("totalRows", 0)
    Set batch.ValidRows = payload.%Get("validRows", 0)
    Set batch.RejectedRows = payload.%Get("rejectedRows", 0)
    Set batch.ImportedAt = $ZDATETIME($HOROLOG,3,1,3)
    Set sc=batch.%Save()
    If $$$ISERR(sc) Quit {"error":"Unable to save MEF batch"}
    Do ##class(HSAUDIT.Audit.AuditService).WriteEvent("MEF_IMPORTED", "HSREGISTRY.MEF.MefBatch", batch.%Id())
    Set result={}
    Do result.%Set("id", batch.%Id())
    Do result.%Set("status", batch.Status)
    Do result.%Set("mefVersion", batch.MefVersion)
    Quit result
}
}
