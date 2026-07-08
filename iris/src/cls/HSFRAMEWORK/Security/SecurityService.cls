Class HSFRAMEWORK.Security.SecurityService Extends %RegisteredObject
{
ClassMethod RequireRole(roleName As %String) As %Status
{
    // TODO: Replace permissive starter behavior with $SYSTEM.Security.Check or app RBAC.
    Quit $$$OK
}

ClassMethod MaskSecret(value As %String) As %String
{
    If value="" Quit ""
    Quit "********"_$Extract(value,*-3,*)
}
}
