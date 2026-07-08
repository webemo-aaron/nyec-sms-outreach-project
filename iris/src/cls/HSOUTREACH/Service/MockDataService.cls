Class HSOUTREACH.Service.MockDataService Extends %RegisteredObject
{
ClassMethod Dashboard() As %DynamicObject
{
    Set data = {}
    Do data.%Set("activeCampaigns", 4)
    Do data.%Set("messagesSentToday", 184)
    Do data.%Set("deliveredToday", 171)
    Do data.%Set("failedToday", 7)
    Do data.%Set("retryPending", 6)
    Do data.%Set("optOutsToday", 3)
    Do data.%Set("dailyLimit", 250)
    Do data.%Set("dailyProgress", 73.6)
    Do data.%Set("estimatedCostToday", 14.72)
    Do data.%Set("twilioStatus", "Healthy")
    Do data.%Set("nextSchedulerRun", "Tomorrow 09:00")

    Set campaigns = []
    Set c1 = {}
    Do c1.%Set("id", 101)
    Do c1.%Set("name", "NYC 1115 Waiver Outreach - Wave 1")
    Do c1.%Set("status", "RUNNING")
    Do c1.%Set("facility", "NYC Health Center A")
    Do c1.%Set("sent", 840)
    Do c1.%Set("remaining", 3160)
    Do campaigns.%Push(c1)
    Do data.%Set("campaigns", campaigns)
    Quit data
}

ClassMethod MefBatches() As %DynamicArray
{
    Set arr = []
    Set b = {}
    Do b.%Set("id", 12)
    Do b.%Set("fileName", "NYeC_MEF_2026_07_06.csv")
    Do b.%Set("mefVersion", "2026-W28")
    Do b.%Set("status", "IMPORTED")
    Do b.%Set("totalRows", 48392)
    Do b.%Set("validRows", 45110)
    Do b.%Set("rejectedRows", 3282)
    Do b.%Set("createdAt", "2026-07-06T06:12:00")
    Do arr.%Push(b)
    Quit arr
}

ClassMethod Campaigns() As %DynamicArray
{
    Set arr = []
    For i=1:1:4 {
        Set c = {}
        Do c.%Set("id", 100+i)
        Do c.%Set("name", $Select(i=1:"1115 Waiver Outreach",i=2:"HITS Registration",i=3:"Care Mgmt Follow-up",1:"Appointment Nudges"))
        Do c.%Set("status", $Select(i=1:"RUNNING",i=2:"SCHEDULED",i=3:"PAUSED",1:"DRAFT"))
        Do c.%Set("facility", "NYC Health Center "_$Char(64+i))
        Do c.%Set("npiLocation", "123456789"_i)
        Do c.%Set("dailyLimit", 50*i)
        Do c.%Set("sent", 210*i)
        Do c.%Set("remaining", 1200-(100*i))
        Do arr.%Push(c)
    }
    Quit arr
}

ClassMethod Dispatches() As %DynamicArray
{
    Set arr=[]
    For i=1:1:6 {
        Set d={}
        Do d.%Set("id", "B-20"_i)
        Do d.%Set("campaign", "1115 Waiver Outreach")
        Do d.%Set("date", "2026-07-0"_(i+1))
        Do d.%Set("selected", 50)
        Do d.%Set("sent", 48)
        Do d.%Set("delivered", 45)
        Do d.%Set("failed", 3)
        Do d.%Set("status", $Select(i<6:"COMPLETE",1:"SENDING"))
        Do arr.%Push(d)
    }
    Quit arr
}

ClassMethod BillingSummary() As %DynamicObject
{
    Set data={}
    Do data.%Set("period", "July 2026")
    Do data.%Set("billableMessages", 4180)
    Do data.%Set("deliveredMessages", 3922)
    Do data.%Set("twilioCost", 313.60)
    Do data.%Set("platformFee", 2500)
    Do data.%Set("estimatedInvoice", 4286.30)
    Do data.%Set("grossMargin", 3972.70)
    Quit data
}
}
