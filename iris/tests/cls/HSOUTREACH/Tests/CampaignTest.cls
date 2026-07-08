Class HSOUTREACH.Tests.CampaignTest Extends %UnitTest.TestCase
{
Method TestMockCampaignList()
{
    Set list = ##class(HSOUTREACH.Service.CampaignService).List()
    Do $$$Assert(list.%Size() > 0, "Mock campaign list should not be empty")
}

Method TestLaunchReturnsScheduled()
{
    Set result = ##class(HSOUTREACH.Service.CampaignService).Launch("101")
    Do $$$AssertEquals(result.%Get("status"), "SCHEDULED")
}
}
