Class HSAUDIT.Audit.AuditService Extends %RegisteredObject
{
ClassMethod WriteEvent(eventType As %String, objectClass As %String = "", objectId As %String = "", afterJson As %String = "") As %Status
{
    Set event = ##class(HSAUDIT.Audit.AuditEvent).%New()
    Set event.EventType = eventType
    Set event.NamespaceName = $Namespace
    Set event.UserId = $Username
    Set event.ObjectClass = objectClass
    Set event.ObjectId = objectId
    Set event.AfterJson = afterJson
    Set event.CorrelationId = $System.Util.CreateGUID()
    Quit event.%Save()
}

ClassMethod Recent(limit As %Integer = 25) As %DynamicArray
{
    Set arr = []
    Set sql = "SELECT TOP ? ID, EventType, ObjectClass, ObjectId, CreatedAt FROM HSAUDIT_Audit.AuditEvent ORDER BY CreatedAt DESC"
    Set rs = ##class(%SQL.Statement).%ExecDirect(, sql, limit)
    While rs.%Next() {
        Set row = {}
        Do row.%Set("id", rs.%Get("ID"))
        Do row.%Set("eventType", rs.%Get("EventType"))
        Do row.%Set("objectClass", rs.%Get("ObjectClass"))
        Do row.%Set("objectId", rs.%Get("ObjectId"))
        Do row.%Set("createdAt", rs.%Get("CreatedAt"))
        Do arr.%Push(row)
    }
    Quit arr
}
}
