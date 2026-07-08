Class HSFRAMEWORK.Core.ApiResponse Extends %RegisteredObject
{
ClassMethod Ok(data As %DynamicAbstractObject = "") As %Status
{
    Set response = {}
    Do response.%Set("ok", 1)
    If data'="" Do response.%Set("data", data)
    Write response.%ToJSON()
    Quit $$$OK
}

ClassMethod Error(message As %String, code As %String = "ERROR") As %Status
{
    Set response = {}
    Do response.%Set("ok", 0)
    Do response.%Set("code", code)
    Do response.%Set("message", message)
    Write response.%ToJSON()
    Quit $$$OK
}
}
